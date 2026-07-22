import type { OhlcvBar } from './types';
import { logPipelineError } from '@/src/lib/pipelineError';

import type { ConnectionStatusCallback, SymbolMap } from '../../base/types';
import { normalizeHyperliquidCandlesChannelData } from './candleParser';
import { PING_INTERVAL_MS, WS_URL } from '../constants';
import { MAX_RECONNECT_ATTEMPTS, RECONNECT_BASE_MS, RECONNECT_MAX_MS } from '../../base/constants';

const LOG_PREFIX = '[HyperliquidCandles]';

type CandleSubscription = {
    type: 'candle';
    coin: string;
    interval: string;
};

export class HyperliquidCandlesClient {
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

    // Currently active subscription (null if no active sub)
    private activeSub: CandleSubscription | null = null;
    // Asset key waiting to be subscribed after connection opens
    private pendingAssetKey: string | null = null;
    // Interval string waiting to be subscribed after connection opens
    private pendingInterval: string | null = null;

    // Maps app-level asset keys to Hyperliquid coin names
    constructor(private readonly symbolMap: SymbolMap) { }

    // Opens the WebSocket connection and registers callbacks
    connect(onBars: (bars: OhlcvBar[]) => void, onConnection: ConnectionStatusCallback): void {
        this.onBars = onBars;
        this.onConnection = onConnection;
        this.intentionalClose = false;
        this.reconnectAttempts = 0;
        this.emitConnection('connecting');
        this.openSocket();
    }

    // Subscribes to candle updates for the given asset and interval
    subscribe(assetKey: string, interval: string): void {
        this.pendingAssetKey = assetKey;
        this.pendingInterval = interval;

        const coin = this.symbolMap[assetKey] ?? null;
        if (!coin) {
            console.warn(`${LOG_PREFIX} Unknown asset key: ${assetKey}`);
            return;
        }

        if (this.ws?.readyState === WebSocket.OPEN) {
            this.applySubscription(coin, interval);
        }
    }

    // Closes the connection intentionally (no reconnect)
    disconnect(): void {
        this.intentionalClose = true;
        this.clearReconnectTimer();
        this.stopPing();
        this.sendUnsubscribeIfNeeded();
        this.activeSub = null;
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
            let msg: { channel?: string; data?: unknown };
            try {
                msg = JSON.parse(event.data as string) as { channel?: string; data?: unknown };
            } catch {
                console.warn(`${LOG_PREFIX} skip non-JSON message`);
                return;
            }

            // Ignore subscription confirmations
            if (msg.channel === 'subscriptionResponse') {
                return;
            }
            // Surface server-side errors
            if (msg.channel === 'error') {
                console.error(`${LOG_PREFIX} server error`, msg.data);
                this.emitConnection('error', String(msg.data));
                return;
            }
            // Normalize and forward candle updates
            if (msg.channel === 'candle') {
                let bars: OhlcvBar[];
                try {
                    bars = normalizeHyperliquidCandlesChannelData(msg.data);
                } catch (err) {
                    logPipelineError(`${LOG_PREFIX} normalize candle`, err);
                    return;
                }
                if (bars.length > 0) {
                    this.onBars?.(bars);
                }
                return;
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
            if (this.intentionalClose) {
                return;
            }
            this.scheduleReconnect();
        };
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
    }

    // Applies a pending subscription once the socket is open
    private flushPendingSubscription(): void {
        if (this.pendingAssetKey == null || this.pendingInterval == null) return;
        const coin = this.symbolMap[this.pendingAssetKey];
        if (!coin) return;
        this.applySubscription(coin, this.pendingInterval);
    }

    // Sends a subscribe message unless already subscribed to the same pair
    private applySubscription(coin: string, interval: string): void {
        if (this.activeSub && this.activeSub.coin === coin && this.activeSub.interval === interval) {
            return;
        }

        this.sendUnsubscribeIfNeeded();

        this.activeSub = { type: 'candle', coin, interval };
        this.send({
            method: 'subscribe',
            subscription: this.activeSub,
        });
    }

    // Unsubscribes from the current active subscription if the socket is open
    private sendUnsubscribeIfNeeded(): void {
        if (!this.activeSub || this.ws?.readyState !== WebSocket.OPEN) {
            this.activeSub = null;
            return;
        }
        this.send({
            method: 'unsubscribe',
            subscription: this.activeSub,
        });
        this.activeSub = null;
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

    // Notifies the consumer of a connection state change
    private emitConnection(
        status: Parameters<ConnectionStatusCallback>[0]['status'],
        errorMessage?: string,
    ): void {
        this.onConnection?.({
            venue: 'hyperliquid',
            status,
            errorMessage,
            reconnectAttempts: this.reconnectAttempts,
        });
    }
}