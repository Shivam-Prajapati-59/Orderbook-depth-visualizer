import type {
    ConnectionStatus,
    ConnectionStatusCallback,
    OrderbookUpdateCallback,
    SymbolMap,
    VenueConnectionState,
    VenueMetaData,
} from "./types";

import { MAX_RECONNECT_ATTEMPTS, RECONNECT_BASE_MS, RECONNECT_MAX_MS } from "./constants";
import { VenueAdapter } from "./adapter.interface";

export abstract class BaseAdapter implements VenueAdapter {
    abstract readonly metadata: VenueMetaData;
    abstract readonly symbolMap: SymbolMap;

    private ws: WebSocket | null = null;
    private intentionalClose = false;
    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private lastWsCloseCode: number | null = null;

    public connectionStatus: ConnectionStatus = 'idle';
    protected currentAsset: string | null = null;
    protected onBookUpdate: OrderbookUpdateCallback | null = null;
    protected onStatusChange: ConnectionStatusCallback | null = null;


    connect(onBookUpdate: OrderbookUpdateCallback, onStatusChange: ConnectionStatusCallback): void {
        this.onBookUpdate = onBookUpdate;
        this.onStatusChange = onStatusChange;
        this.intentionalClose = false;
        this.reconnectAttempts = 0;

        this.openSocket();
    }

    disconnect(): void {
        this.intentionalClose = true;
        this.clearReconnectTimer();
        this.stopKeepalive();
        this.closeSocket();

        this.onBookUpdate = null;
        this.onStatusChange = null;
    }

    destroy(): void {
        this.disconnect();
    }

    resolveSymbol(asset: string): string | null {
        return this.symbolMap[asset] ?? null;
    }
    abstract getOrderbookTickSize(asset: string): Promise<number | null>;

    abstract subscribe(asset: string): void;
    abstract unsubscribe(): void;

    protected abstract onConnected(): void;

    protected abstract onMessage(event: MessageEvent): void;

    protected abstract startKeepalive(): void;
    protected abstract stopKeepalive(): void;

    protected abstract getWsUrl(): string;

    private closeSocket(): void {
        if (this.ws) {
            this.ws.onopen = null;
            this.ws.onmessage = null;
            this.ws.onerror = null;
            this.ws.onclose = null;
            this.ws.close();
            this.ws = null;
        }
    }

    private openSocket(): void {

        this.emitStatus('connecting');

        try {
            this.ws = new WebSocket(this.getWsUrl());
        } catch (error) {
            console.error(`[${this.metadata.label}] Failed to construct WebSocket`, error);
            this.emitStatus('error', 'Failed to open WebSocket');
            this.scheduleReconnect();
            return;
        }

        this.ws.onopen = this.handleOpen;
        this.ws.onmessage = this.handleMessage;
        this.ws.onerror = this.handleError;
        this.ws.onclose = this.handleClose;
    }



    private handleOpen = (): void => {
        console.info(`[${this.metadata.label}] Connected`);
        this.reconnectAttempts = 0;
        this.emitStatus('connected');
        this.startKeepalive();
        this.onConnected(); // let subclass send pending subscription
    };

    private handleMessage = (event: MessageEvent): void => {
        this.onMessage(event); // delegate entirely to subclass
    };

    private handleError = (event: Event): void => {
        console.error(`[${this.metadata.label}] WebSocket connection error`, event);
        this.emitStatus('error', 'WebSocket connection error');
    };

    private handleClose = (event: CloseEvent): void => {
        this.lastWsCloseCode = event.code;
        console.info(
            `[${this.metadata.label}] Connection closed (code=${event.code}, intentional=${this.intentionalClose})`,
        );
        this.stopKeepalive();

        if (this.intentionalClose) {
            this.emitStatus('closed');
            return;
        }

        this.scheduleReconnect();
    };

    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            const detail =
                this.lastWsCloseCode != null
                    ? `Max reconnect attempts reached (last close code: ${this.lastWsCloseCode})`
                    : 'Max reconnect attempts reached';
            console.error(`[${this.metadata.label}] WebSocket error:`, detail);
            this.emitStatus('error', detail);
            return;
        }

        const delay = Math.min(RECONNECT_BASE_MS * 2 ** this.reconnectAttempts, RECONNECT_MAX_MS);

        console.info(
            `[${this.metadata.label}] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`,
        );

        this.emitStatus('reconnecting');
        this.reconnectAttempts += 1;

        this.reconnectTimer = setTimeout(() => {
            this.closeSocket();
            this.openSocket();
        }, delay);
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    protected send(message: unknown): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn(`[${this.metadata.label}] Tried to send while socket not open`);
            return;
        }
        this.ws.send(JSON.stringify(message));
    }

    protected emitStatus(status: VenueConnectionState['status'], errorMessage?: string): void {
        this.connectionStatus = status;
        this.onStatusChange?.({
            venue: this.metadata.id,
            status,
            errorMessage,
            reconnectAttempts: this.reconnectAttempts,
        });
    }
}