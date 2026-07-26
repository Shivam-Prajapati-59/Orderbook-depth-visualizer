import type { OhlcvBar } from './types';
import { logPipelineError } from '@/src/lib/pipelineError';

import type { ConnectionStatusCallback, SymbolMap } from '../../base/types';
import { normalizeAsterWsKline } from './candleParser';
import { PING_INTERVAL_MS, WS_URL } from '../constants';
import { MAX_RECONNECT_ATTEMPTS, RECONNECT_BASE_MS, RECONNECT_MAX_MS } from '../../base/constants';

const LOG_PREFIX = '[AsterCandles]';

// Rolling ID counter for subscribe/unsubscribe requests
let wsIdCounter = 100;
function nextWsId(): number {
    return wsIdCounter++;
}

export class AsterCandlesClient {
    // Active WebSocket connection instance
    private ws: WebSocket | null = null;
    // Flag to distinguish intentional close from unexpected drops
    private intentionalClose = false;
    // Counter for reconnection attempts (resets on successful connect)
    private reconnectAttempts = 0;
    // Timer handle for delayed reconnection
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    // Interval handle for keepalive pings
    private pingTimer: ReturnType<typeof setInterval> | null = null;
    // Last close code from the WebSocket for diagnostic logging
    private lastCloseCode: number | null = null;
    // Callback invoked when normalized candle bars arrive
    private onBars: ((bars: OhlcvBar[]) => void) | null = null;
    // Callback invoked when connection status changes
    private onConnection: ConnectionStatusCallback | null = null;
    // Currently active stream name (null if no active subscription)
    private activeStream: string | null = null;
    // Asset key waiting to be subscribed after connection opens
    private pendingAssetKey: string | null = null;
    // Interval string waiting to be subscribed after connection opens
    private pendingInterval: string | null = null;
    // Maps request ID → stream name for tracking pending SUBSCRIBE requests
    private pendingReqStream: Map<number, string> = new Map();
    // Request ID of the most recent SUBSCRIBE that set activeStream — guards against stale responses
    private activeStreamReqId = 0;

    // Maps app-level asset keys to Aster USDT-perp symbol strings (e.g. 'BTCUSDT')
    constructor(private readonly symbolMap: SymbolMap) { }

    // Subscribes to kline updates for the given asset and interval
    subscribe(assetKey: string, interval: string): void {
        this.pendingAssetKey = assetKey;
        this.pendingInterval = interval;

        const symbol = this.symbolMap[assetKey] ?? null;
        if (!symbol) {
            console.warn(`${LOG_PREFIX} Unknown asset key: ${assetKey}`);
            return;
        }

        if (this.ws?.readyState === WebSocket.OPEN) {
            this.applySubscription(symbol, interval);
        }
    }

    // Closes the connection intentionally (no reconnect)
    disconnect(): void {
        this.intentionalClose = true;
        this.clearReconnectTimer();
        this.stopPing();
        this.sendUnsubscribeIfNeeded();
        this.activeStream = null;
        this.pendingAssetKey = null;
        this.pendingInterval = null;
        this.closeSocket();
        this.emitConnection('closed');
    }

    // Tears down the client, clearing all callbacks and closing the connection
    destroy(): void {
        this.disconnect();
        this.onBars = null;
        this.onConnection = null;
    }

    // Opens the WebSocket connection and registers callbacks
    connect(onBars: (bars: OhlcvBar[]) => void, onConnection: ConnectionStatusCallback): void {
        this.onBars = onBars;
        this.onConnection = onConnection;
        this.intentionalClose = false;
        this.reconnectAttempts = 0;
        this.emitConnection('connecting');
        this.openSocket();
    }

    // Creates a new WebSocket and wires up the event handlers
    private openSocket(): void {
        try {
            this.ws = new WebSocket(WS_URL);
        } catch (e) {
            logPipelineError(`${LOG_PREFIX} WebSocket construct`, e);
            this.emitConnection('error', 'Failed to open WebSocket');
            this.scheduleReconnect();
            return;
        }

        this.ws.onopen = () => {
            console.info(`${LOG_PREFIX} connected`);
            this.reconnectAttempts = 0;
            this.emitConnection('connected');
            this.startPing();
            this.flushPendingSubscription();
        };

        this.ws.onmessage = (event) => {
            let parsed: unknown;
            try {
                parsed = JSON.parse(event.data as string);
            } catch {
                console.warn(`${LOG_PREFIX} skip non-JSON message`);
                return;
            }

            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                return;
            }

            const msg = parsed as Record<string, unknown>;

            // Unwrap combined-stream envelope: { stream: 'btcusdt@kline_1m', data: { ... } }
            const payload = 'stream' in msg && 'data' in msg
                ? (msg.data as Record<string, unknown>)
                : msg;

            // Successful subscription ACK: { result: null, id: <number> }
            if ('result' in payload && 'id' in payload) {
                const id = payload.id as number;
                this.pendingReqStream.delete(id);
                return;
            }

            // Rejection from Aster: { code: <number>, msg: <string>, id?: <number> }
            if ('code' in payload && 'msg' in payload) {
                const id = payload.id as number | undefined;
                if (id != null) {
                    if (id === this.activeStreamReqId) {
                        this.activeStream = null;
                        this.activeStreamReqId = 0;
                        this.pendingAssetKey = null;
                        this.pendingInterval = null;
                    }
                    this.pendingReqStream.delete(id);
                }
                this.emitConnection('error', `Subscription rejected: ${String(payload.msg)}`);
                return;
            }

            // Only process kline events
            if (payload.e !== 'kline' || !payload.k) {
                return;
            }

            try {
                const bar = normalizeAsterWsKline(payload.k);
                if (bar !== null) {
                    this.onBars?.([bar]);
                }
            } catch (err) {
                logPipelineError(`${LOG_PREFIX} normalize kline`, err);
            }
        };

        this.ws.onerror = (ev) => {
            logPipelineError(`${LOG_PREFIX} socket error`, ev);
            this.emitConnection('error', 'WebSocket connection error');
        };

        this.ws.onclose = (ev) => {
            this.lastCloseCode = ev.code;
            console.info(`${LOG_PREFIX} closed code=${ev.code} intentional=${this.intentionalClose}`);
            this.stopPing();
            this.ws = null;
            // Server-side subscriptions belong to the closed socket.
            this.activeStream = null;
            this.activeStreamReqId = 0;
            this.pendingReqStream.clear();
            if (this.intentionalClose) {
                return;
            }
            this.scheduleReconnect();
        };
    }

    // Applies a pending subscription once the socket is open
    private flushPendingSubscription(): void {
        if (this.pendingAssetKey == null || this.pendingInterval == null) return;
        const symbol = this.symbolMap[this.pendingAssetKey];
        if (!symbol) return;
        this.applySubscription(symbol, this.pendingInterval);
    }

    // Builds the Aster kline stream name and sends the SUBSCRIBE message
    private applySubscription(symbol: string, interval: string): void {
        const streamName = `${symbol.toLowerCase()}@kline_${interval}`;

        if (this.activeStream === streamName) return;

        this.sendUnsubscribeIfNeeded();

        const id = nextWsId();
        this.pendingReqStream.set(id, streamName);
        this.activeStream = streamName;
        this.activeStreamReqId = id;
        this.send({
            method: 'SUBSCRIBE',
            params: [streamName],
            id,
        });
    }

    // Unsubscribes from the active stream if the socket is open
    private sendUnsubscribeIfNeeded(): void {
        if (!this.activeStream || this.ws?.readyState !== WebSocket.OPEN) {
            this.activeStream = null;
            this.activeStreamReqId = 0;
            return;
        }
        this.send({
            method: 'UNSUBSCRIBE',
            params: [this.activeStream],
            id: nextWsId(),
        });
        this.activeStream = null;
        this.activeStreamReqId = 0;
    }

    // Sends a JSON-serialized message through the WebSocket
    private send(payload: unknown): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn(`${LOG_PREFIX} send skipped — socket not open`);
            return;
        }
        this.ws.send(JSON.stringify(payload));
    }

    // Starts periodic ping to keep the WebSocket connection alive
    private startPing(): void {
        this.stopPing();
        this.pingTimer = setInterval(() => {
            this.send({ method: 'ping' });
        }, PING_INTERVAL_MS);
    }

    // Stops the keepalive ping interval
    private stopPing(): void {
        if (this.pingTimer != null) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }

    // Schedules a reconnection with exponential backoff
    private scheduleReconnect(): void {
        if (this.intentionalClose) return;
        if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            const detail =
                this.lastCloseCode != null
                    ? `Max reconnect attempts reached (last close code: ${this.lastCloseCode})`
                    : 'Max reconnect attempts reached';
            logPipelineError(`${LOG_PREFIX} max reconnects`, new Error(detail));
            this.emitConnection('error', detail);
            return;
        }

        const delay = Math.min(RECONNECT_BASE_MS * 2 ** this.reconnectAttempts, RECONNECT_MAX_MS);
        this.reconnectAttempts += 1;
        this.emitConnection('reconnecting');

        this.clearReconnectTimer();
        this.reconnectTimer = setTimeout(() => {
            this.closeSocket();
            this.openSocket();
        }, delay);
    }

    // Clears the reconnect timeout if one is active
    private clearReconnectTimer(): void {
        if (this.reconnectTimer != null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    // Nullifies all event handlers and closes the underlying socket
    private closeSocket(): void {
        if (!this.ws) return;
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
        this.ws = null;
        this.pendingReqStream.clear();
    }

    // Notifies the consumer of a connection state change
    private emitConnection(
        status: Parameters<ConnectionStatusCallback>[0]['status'],
        errorMessage?: string,
    ): void {
        this.onConnection?.({
            venue: 'aster',
            status,
            errorMessage,
            reconnectAttempts: this.reconnectAttempts,
        });
    }
}
