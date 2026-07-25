import { PACIFICA_SYMBOL_MAP } from '@/src/config/trademarket';
import { BaseAdapter } from '../../base/baseAdapter';
import { SymbolMap, VenueMetaData } from '../../base/types';
import { PING_INTERVAL_MS, WS_URL } from '../constants';
import { PacificaParser } from './parser';
import { getPacificaOrderbookTick } from './priceTick';
import { logPipelineError } from '@/src/lib/pipelineError';
import type { PacificaInboundMessage } from './types';

// Aggregation levels supported by Pacifica's book subscription
type AggLevel = 1 | 10 | 100 | 1000 | 10000;

export class PacificaAdapter extends BaseAdapter {

    // Static metadata describing the Pacifica venue
    readonly metadata: VenueMetaData = {
        id: 'pacifica',
        label: 'Pacifica',
        tickSize: 0.1, // safe fallback; overridden by priceTick REST fetch
    };

    // Maps standard app symbols (e.g. 'BTC') to Pacifica symbols (e.g. 'BTC')
    readonly symbolMap: SymbolMap = PACIFICA_SYMBOL_MAP;

    // Orderbook parser instance
    private parser = new PacificaParser();

    // Reference to the keepalive ping interval
    private pingInterval: ReturnType<typeof setInterval> | null = null;

    // Current aggregation level for the active subscription
    private aggLevel: AggLevel = 1;

    // Resolved tick size from the REST API; overrides metadata.tickSize
    private resolvedTick: number | null = null;

    // Returns the Pacifica WebSocket URL
    protected getWsUrl(): string {
        return WS_URL;
    }

    // Called automatically by BaseAdapter when the socket successfully opens
    protected onConnected(): void {
        if (this.currentAsset) {
            // Fetch REST tick size in the background and update parser when ready
            this.fetchAndApplyTickSize(this.currentAsset);
            this.sendSubscribe(this.currentAsset);
        }
    }

    // Subscribes to the orderbook for a given asset symbol
    subscribe(asset: string): void {
        // Unsubscribe from old asset if switching
        if (this.currentAsset && this.currentAsset !== asset && this.connectionStatus === 'connected') {
            this.sendUnsubscribe(this.currentAsset);
        }

        // Clear stale tick when switching to a different asset
        if (this.currentAsset !== asset) {
            this.resolvedTick = null;
        }

        this.currentAsset = asset;

        if (this.connectionStatus === 'connected') {
            this.fetchAndApplyTickSize(asset);
            this.sendSubscribe(asset);
        }
    }

    // Unsubscribes from the current asset's orderbook
    unsubscribe(): void {
        if (!this.currentAsset) return;

        if (this.connectionStatus === 'connected') {
            this.sendUnsubscribe(this.currentAsset);
        }

        this.currentAsset = null;
        this.resolvedTick = null;
    }


    // Fetches the correct tick size (minimum price movement) for the asset
    async getOrderbookTickSize(asset: string): Promise<number | null> {
        return getPacificaOrderbookTick(asset);
    }

    // Returns the API-resolved tick size, falling back to metadata default if unavailable
    get resolvedTickSize(): number | null {
        return this.resolvedTick;
    }

    // Changes the price aggregation level and resubscribes on the same open socket
    setAggLevel(level: AggLevel): void {
        if (this.aggLevel === level) return; // no-op if unchanged

        this.aggLevel = level;

        // Only resub if we have an active asset and a live connection
        if (this.currentAsset && this.connectionStatus === 'connected') {
            // Unsubscribe with old level, subscribe with new level
            this.sendUnsubscribe(this.currentAsset);
            this.sendSubscribe(this.currentAsset);
        }
    }

    // Sends the subscribe request using the correct Pacifica params format
    private sendSubscribe(asset: string): void {
        const symbol = this.resolveSymbol(asset);
        if (!symbol) {
            console.warn(`[PacificaAdapter] Unknown asset: ${asset}`);
            return;
        }

        this.send({
            method: 'subscribe',
            params: {
                source: 'book',
                symbol,
                agg_level: this.aggLevel,
            },
        });
    }

    // Sends the unsubscribe request for the current aggLevel
    private sendUnsubscribe(asset: string): void {
        const symbol = this.resolveSymbol(asset);
        if (!symbol) return;

        this.send({
            method: 'unsubscribe',
            params: {
                source: 'book',
                symbol,
            },
        });
    }

    // Starts sending periodic pings to keep the WebSocket alive
    protected startKeepalive(): void {
        this.stopKeepalive();
        this.pingInterval = setInterval(() => {
            this.send({ method: 'ping' });
        }, PING_INTERVAL_MS);
    }

    // Stops the keepalive ping interval
    protected stopKeepalive(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    // Type guard: true for non-null, non-array objects
    private isMessageObject(raw: unknown): raw is Record<string, unknown> {
        return typeof raw === 'object' && raw !== null && !Array.isArray(raw);
    }

    // Handles all incoming WebSocket messages from Pacifica
    protected onMessage(event: MessageEvent): void {
        let parsed: unknown;
        try {
            parsed = JSON.parse(event.data as string);
        } catch {
            console.warn('[PacificaAdapter] Unparseable message', event.data);
            return;
        }

        // Reject non-object payloads (null, strings, arrays, numbers) after parsing
        if (!this.isMessageObject(parsed)) {
            console.warn('[PacificaAdapter] Non-object message', parsed);
            return;
        }

        const msg = parsed as PacificaInboundMessage;

        // Handle server-initiated pings (type field is not part of the union)
        if ((msg as Record<string, unknown>).type === 'ping') {
            this.send({ type: 'pong' });
            return;
        }

        // Surface subscription responses and errors
        if (msg.channel === 'error') {
            logPipelineError('PacificaAdapter.serverError', msg.data);
            this.emitStatus('error', `Pacifica server error: ${JSON.stringify(msg.data)}`);
            return;
        }

        // Only process book channel messages
        if (msg.channel !== 'book' || !msg.data) return;

        try {
            const bookMsg = msg as import('./types').PacificaOrderBookMessage;
            const currentSymbol = this.currentAsset && this.resolveSymbol(this.currentAsset);
            if (!currentSymbol || bookMsg.data.s !== currentSymbol) return;

            const parsedBook = this.parser.parse(bookMsg.data);
            this.onBookUpdate?.(parsedBook);
        } catch (e) {
            logPipelineError('PacificaAdapter.onMessage.parse', e);
        }
    }

    // Fetches tick size from REST and caches it for external consumers
    private async fetchAndApplyTickSize(asset: string): Promise<void> {
        try {
            const tick = await getPacificaOrderbookTick(asset);
            // Only cache if the asset hasn't changed while the request was in flight
            if (this.currentAsset === asset && tick != null) {
                this.resolvedTick = tick;
            }
        } catch (e) {
            logPipelineError('PacificaAdapter.fetchAndApplyTickSize', e);
        }
    }
}