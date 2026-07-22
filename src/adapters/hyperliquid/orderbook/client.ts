import { HYPERLIQUID_SYMBOL_MAP } from "@/src/config/trademarket";
import { BaseAdapter } from "../../base/baseAdapter";
import { SymbolMap, VenueMetaData } from "../../base/types";
import { WS_URL } from "../constants";
import { HyperliquidParser } from "./parser";
import { getHyperliquidOrderbookTick } from "./priceTick";

export class HyperliquidAdapter extends BaseAdapter {
    // Static metadata describing this venue
    readonly metadata: VenueMetaData = {
        id: 'hyperliquid',
        label: 'Hyperliquid',
        tickSize: 0.01,
    };
    // Maps standard app symbols (e.g. BTC) to HL coins (e.g. BTC-PERP)
    readonly symbolMap: SymbolMap = HYPERLIQUID_SYMBOL_MAP;

    // The parser used to normalize incoming L2 data
    private parser = new HyperliquidParser();
    // Reference to the ping interval timer
    private pingInterval: ReturnType<typeof setInterval> | null = null;

    // Returns the WebSocket URL for Hyperliquid
    protected getWsUrl(): string {
        return WS_URL;
    }

    // Called automatically by BaseAdapter when the socket opens
    protected onConnected(): void {
        if (this.currentAsset) {
            this.sendSubscribe(this.currentAsset);
        }
    }

    // Subscribes to a new asset's orderbook
    subscribe(asset: string): void {
        if (this.currentAsset && this.currentAsset !== asset) {
            this.sendUnsubscribe(this.currentAsset);
        }

        this.currentAsset = asset;

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
    }

    // Sends the raw JSON subscribe message to the WebSocket
    private sendSubscribe(asset: string) {
        const symbol = this.resolveSymbol(asset);
        if (!symbol) {
            console.warn(`[HyperliquidAdapter] Unknown asset: ${asset}`);
            return;
        }

        this.send({
            method: 'subscribe',
            subscription: { type: 'l2Book', coin: symbol },
        });
    }

    // Sends the raw JSON unsubscribe message to the WebSocket
    private sendUnsubscribe(asset: string) {
        const symbol = this.resolveSymbol(asset);
        if (!symbol) return;

        this.send({
            method: 'unsubscribe',
            subscription: { type: 'l2Book', coin: symbol },
        });
    }

    // Fetches the correct tick size (minimum price movement) for the asset
    async getOrderbookTickSize(asset: string): Promise<number | null> {
        return getHyperliquidOrderbookTick(asset);
    }

    // Starts sending periodic pings to keep the connection alive
    protected startKeepalive(): void {
        this.stopKeepalive();
        this.pingInterval = setInterval(() => {
            this.send({ method: 'ping' });
        }, 50000); // Hyperliquid expects a ping roughly every 50 seconds
    }

    // Stops the ping interval
    protected stopKeepalive(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    // Handles all incoming messages from the WebSocket
    protected onMessage(event: MessageEvent): void {
        try {
            const data = JSON.parse(event.data);

            // Handle L2 orderbook updates
            if (data?.channel === 'l2Book' && data?.data) {
                const parsedBook = this.parser.parse(data.data);
                if (this.onBookUpdate) {
                    this.onBookUpdate(parsedBook);
                }
            }
        } catch (e) {
            console.error('[HyperliquidAdapter] Failed to parse message', e);
        }
    }
}
