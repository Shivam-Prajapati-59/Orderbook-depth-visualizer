import { NormalizedOrderBook, OrderBookLevel } from '../../base/types';
import { logPipelineError } from '@/src/lib/pipelineError';
import { normalizePriceForSide } from '@/src/features/orderbook/lib/normalizePrice';

import { LighterOrderBookPayload, LighterRawLevel } from './types';

const CANONICAL_PRICE_DP = 8;

export class LighterParser {

    // Internal maps to store the current state of bids and asks by normalized price
    private bids = new Map<string, number>();
    private asks = new Map<string, number>();

    // Flag to determine if the payload is the initial snapshot
    private isFirstMessage = true;
    // Current asset being tracked
    private asset: string = '';
    // Cached tick size for price normalization
    private venueTick: number | null = null;

    // Sets the current asset being parsed
    setAsset(asset: string): void {
        this.asset = asset;
    }

    // Updates the effective tick size and recalculates existing levels if needed
    setVenueTick(tick: number | null): void {
        const next = tick != null && Number.isFinite(tick) && tick > 0 ? tick : null;
        const prevEff = this.effectiveTick();
        this.venueTick = next;
        const newEff = this.effectiveTick();
        if (prevEff !== newEff && (this.bids.size > 0 || this.asks.size > 0)) {
            this.bids = this.rekeyMap(this.bids, 'bid', newEff);
            this.asks = this.rekeyMap(this.asks, 'ask', newEff);
        }
    }

    // Gets the effective tick size, defaulting to 0.01
    private effectiveTick(): number {
        return this.venueTick ?? 0.01;
    }

    // Remaps the price levels to a new tick size
    private rekeyMap(
        map: Map<string, number>,
        side: 'bid' | 'ask',
        tick: number,
    ): Map<string, number> {
        const out = new Map<string, number>();
        for (const [k, sz] of map) {
            const p = parseFloat(k);
            if (!Number.isFinite(p) || sz <= 0) continue;
            const nk = normalizePriceForSide(p, tick, side).toFixed(CANONICAL_PRICE_DP);
            out.set(nk, (out.get(nk) ?? 0) + sz);
        }
        return out;
    }

    // Clears all internal state for a fresh start
    reset(): void {
        this.bids.clear();
        this.asks.clear();
        this.isFirstMessage = true;
    }

    // Processes an incoming Lighter OrderBook payload and returns a normalized snapshot
    apply(payload: LighterOrderBookPayload): NormalizedOrderBook {
        try {
            // Apply levels
            if (this.isFirstMessage) {
                this.bids.clear();
                this.asks.clear();
                this.applyLevels(this.bids, payload.bids ?? [], 'bid');
                this.applyLevels(this.asks, payload.asks ?? [], 'ask');
                this.isFirstMessage = false;
            } else {
                this.applyLevels(this.bids, payload.bids ?? [], 'bid');
                this.applyLevels(this.asks, payload.asks ?? [], 'ask');
            }

            return this.buildSnapshot(payload.last_updated_at);
        } catch (err) {
            logPipelineError('LighterParser.apply', err);
            const ts = Number.isFinite(payload.last_updated_at) ? payload.last_updated_at : Date.now();
            return {
                venue: 'lighter',
                bids: [],
                asks: [],
                asset: this.asset,
                lastUpdatedAt: ts,
            };
        }
    }
    // Updates the internal map with new raw levels from Lighter
    private applyLevels(map: Map<string, number>, levels: LighterRawLevel[], side: 'bid' | 'ask'): void {
        const tick = this.effectiveTick();

        for (const level of levels) {
            const size = parseFloat(level.size);

            if (isNaN(size)) continue;

            const price = parseFloat(level.price);
            if (!Number.isFinite(price) || price <= 0) continue;

            const normalizedPrice = normalizePriceForSide(price, tick, side);
            const key = normalizedPrice.toFixed(CANONICAL_PRICE_DP);

            if (size === 0) {
                map.delete(key);
            } else {
                map.set(key, size);
            }
        }
    }

    // Compiles the current bids and asks into a NormalizedOrderBook snapshot
    private buildSnapshot(lastUpdatedAt: number): NormalizedOrderBook {
        const bids = this.mapToLevels(this.bids, 'bid')
        const asks = this.mapToLevels(this.asks, 'ask')

        return {
            venue: 'lighter',
            bids,
            asks,
            asset: this.asset,
            lastUpdatedAt: lastUpdatedAt
        }
    }

    // Converts an internal price->size map into an array of OrderBookLevel objects, correctly sorted
    private mapToLevels(map: Map<string, number>, side: 'bid' | 'ask'): OrderBookLevel[] {
        const levels: OrderBookLevel[] = [];

        for (const [priceStr, size] of map) {
            const price = parseFloat(priceStr);

            if (isNaN(price) || price <= 0 || size <= 0) continue;

            levels.push({ price, size, venue: 'lighter' });
        }

        // Bids: descending, Asks: ascending
        if (side === 'bid') {
            levels.sort((a, b) => b.price - a.price);
        } else {
            levels.sort((a, b) => a.price - b.price);
        }

        return levels;
    }

}