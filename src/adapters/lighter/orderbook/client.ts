import { BaseAdapter } from '../../base/baseAdapter';
import type { SymbolMap, VenueMetaData } from '../../base/types';
import { logPipelineError } from '@/src/lib/pipelineError';
import { LighterParser } from './parser';
import type { LighterInboundMessage, LighterOrderBookPayload } from './types';
import { LIGHTER_MARKET_INDEX, LIGHTER_SYMBOL_MAP } from '@/src/config/trademarket';
import { KEEPALIVE_INTERVAL_MS, WS_URL } from '../constants';
import { getLighterOrderbookTick } from './priceTick';


function orderBookMarketIndexFromChannel(channel: string | undefined): number | null {
    if (!channel?.startsWith('order_book')) return null;
    const tail = channel.slice('order_book'.length);
    if (tail.length < 2 || (tail[0] !== '/' && tail[0] !== ':')) return null;
    const n = Number(tail.slice(1));
    return Number.isFinite(n) ? n : null;
}
export class LighterAdapter extends BaseAdapter {
    // Static metadata describing the Lighter venue
    readonly metadata: VenueMetaData = {
        id: 'lighter',
        label: 'Lighter',
        tickSize: 0.01,
    };

    // Maps standard app symbols (e.g. BTC) to Lighter market symbols
    readonly symbolMap: SymbolMap = LIGHTER_SYMBOL_MAP;

    // Lighter orderbook parser instance
    private parser = new LighterParser();
    // Reference to the ping interval timer
    private keepaliveTimer: ReturnType<typeof setInterval> | null = null;

    // Returns the WebSocket URL for Lighter
    protected getWsUrl(): string {
        return WS_URL;
    }

    // Helper to extract the market index from a channel string (e.g., 'order_book/0')
    private getMarketIndexFromChannel(channel: string): number | null {
        if (!channel.startsWith('order_book/')) return null;
        const indexStr = channel.split('/')[1];
        const index = parseInt(indexStr, 10);
        return isNaN(index) ? null : index;
    }


    // Automatically called by BaseAdapter when the socket successfully connects
    protected onConnected(): void {
        if (this.currentAsset) {
            this.parser.reset();
            this.sendSubscribe(this.currentAsset);
        }
    }

    // Handles all incoming WebSocket messages from Lighter
    protected onMessage(event: MessageEvent): void {
        let parsed: LighterInboundMessage

        try {
            parsed = JSON.parse(event.data as string) as LighterInboundMessage;
        } catch {
            console.warn('[LighterAdapter] Unparseable message', event.data);
            return;
        }

        if (parsed.type === 'ping') {
            this.send({ type: 'pong' });
            return;
        }

        if (parsed.type !== 'update/order_book' && parsed.type !== 'subscribed/order_book') {
            return;
        }

        if (!this.currentAsset) {
            return;
        }
        const marketIndex = LIGHTER_MARKET_INDEX[this.currentAsset];
        if (marketIndex === undefined) {
            return;
        }

        const msg = parsed as { channel: string; order_book: LighterOrderBookPayload };
        if (orderBookMarketIndexFromChannel(msg.channel) !== marketIndex) {
            return;
        }
        let book;
        try {
            book = this.parser.apply(msg.order_book);
        } catch (err) {
            logPipelineError('LighterAdapter.onMessage.apply', err);
            return;
        }
        this.onBookUpdate?.(book);
    }

    // Starts sending periodic pings to keep the connection alive
    protected startKeepalive(): void {
        this.stopKeepalive();
        this.keepaliveTimer = setInterval(() => {
            this.send({ type: 'ping' });
        }, KEEPALIVE_INTERVAL_MS);
    }

    // Stops the ping interval
    protected stopKeepalive(): void {
        if (this.keepaliveTimer !== null) {
            clearInterval(this.keepaliveTimer);
            this.keepaliveTimer = null;
        }
    }

    // Subscribes to a new asset's orderbook
    subscribe(asset: string): void {
        if (this.currentAsset && this.currentAsset !== asset && this.connectionStatus === 'connected') {
            this.sendUnsubscribe(this.currentAsset);
        }
        this.currentAsset = asset;
        this.parser.reset();
        this.parser.setAsset(asset);

        if (this.connectionStatus === 'connected') {
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
        this.parser.reset();
    }

    // Sends the raw JSON subscribe message to the WebSocket
    private sendSubscribe(asset: string): void {
        const marketIndex = LIGHTER_MARKET_INDEX[asset];

        if (marketIndex === undefined) {
            console.warn(`[LighterAdapter] Unknown asset, no market index: ${asset}`);
            return;
        }

        this.send({
            type: 'subscribe',
            channel: `order_book/${marketIndex}`,
        });
    }

    // Sends the raw JSON unsubscribe message to the WebSocket
    private sendUnsubscribe(asset: string): void {
        const marketIndex = LIGHTER_MARKET_INDEX[asset];
        if (marketIndex === undefined) return;

        this.send({
            type: 'unsubscribe',
            channel: `order_book/${marketIndex}`,
        });
    }

    // Fetches the correct tick size (minimum price movement) for the asset
    async getOrderbookTickSize(asset: string): Promise<number | null> {
        const fromApi = await getLighterOrderbookTick(asset);
        const t =
            fromApi != null && fromApi > 0
                ? fromApi
                : this.metadata.tickSize > 0
                    ? this.metadata.tickSize
                    : null;
        if (this.currentAsset === asset) {
            this.parser.setVenueTick(t);
        }
        return t;
    }
}