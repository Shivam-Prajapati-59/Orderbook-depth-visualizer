import { NormalizedOrderBook, OrderBookLevel } from '../../base/types';
import { logPipelineError } from '@/src/lib/pipelineError';
import type { AsterRawLevel, AsterRawBookMessage, DepthSnapshot } from './types';

const CANONICAL_PRICE_DP = 8;
const MAX_PENDING_UPDATES = 10_000;

function emptyBook(symbol: string): NormalizedOrderBook {
    return {
        venue: 'aster',
        asset: symbol,
        bids: [],
        asks: [],
        lastUpdatedAt: Date.now(),
    };
}

export class AsterParser {
    private bids = new Map<string, number>();
    private asks = new Map<string, number>();
    private currentSymbol = '';
    private bootstrapping = false;
    private seeded = false;
    private ready = false;
    private lastUpdateId = 0;
    private lastU = 0;
    private pendingUpdates: AsterRawBookMessage[] = [];
    private _needsSnapshot = false;
    private generation = 0;

    reset(): void {
        this.bids.clear();
        this.asks.clear();
        this.currentSymbol = '';
        this.bootstrapping = false;
        this.seeded = false;
        this.ready = false;
        this.pendingUpdates = [];
        this.lastUpdateId = 0;
        this.lastU = 0;
        this._needsSnapshot = false;
    }

    isReady(): boolean { return this.ready; }
    isBootstrapping(): boolean { return this.bootstrapping; }
    get needsSnapshot(): boolean { return this._needsSnapshot; }

    startBootstrap(symbol: string): void {
        this.generation++;
        this.bids.clear();
        this.asks.clear();
        this.currentSymbol = symbol;
        this.bootstrapping = true;
        this.seeded = false;
        this.ready = false;
        this.pendingUpdates = [];
        this.lastUpdateId = 0;
        this.lastU = 0;
        this._needsSnapshot = false;
    }

    seedSnapshot(snapshot: DepthSnapshot): void {
        if (this.currentSymbol !== snapshot.symbol) return;
        const gen = this.generation;
        this.lastUpdateId = snapshot.lastUpdateId;
        this.bids.clear();
        this.asks.clear();
        for (const raw of snapshot.bids) {
            const price = parseFloat(raw[0]);
            const size = parseFloat(raw[1]);
            if (isNaN(price) || price <= 0) continue;
            if (size > 0) {
                this.bids.set(price.toFixed(CANONICAL_PRICE_DP), size);
            }
        }
        for (const raw of snapshot.asks) {
            const price = parseFloat(raw[0]);
            const size = parseFloat(raw[1]);
            if (isNaN(price) || price <= 0) continue;
            if (size > 0) {
                this.asks.set(price.toFixed(CANONICAL_PRICE_DP), size);
            }
        }
        this.bootstrapping = false;
        this.seeded = true;
        this.replayPending(gen);
    }

    private replayPending(gen: number): void {
        let firstAccepted = false;
        const remaining: AsterRawBookMessage[] = [];
        for (const event of this.pendingUpdates) {
            if (gen !== this.generation) return;
            if (!firstAccepted) {
                if (event.u < this.lastUpdateId + 1) continue;
                if (event.U > this.lastUpdateId + 1) {
                    remaining.push(event);
                    continue;
                }
                firstAccepted = true;
                this.applyLevels(this.bids, event.b);
                this.applyLevels(this.asks, event.a);
                this.lastU = event.u;
            } else {
                if (event.pu !== this.lastU) {
                    this.enterBootstrapping();
                    this.pendingUpdates = remaining.concat(this.pendingUpdates.slice(this.pendingUpdates.indexOf(event)));
                    return;
                }
                this.applyLevels(this.bids, event.b);
                this.applyLevels(this.asks, event.a);
                this.lastU = event.u;
            }
        }
        this.pendingUpdates = firstAccepted ? [] : this.pendingUpdates;
        if (gen !== this.generation) return;
        if (firstAccepted) {
            this.seeded = false;
            this.ready = true;
        }
    }

    private enterBootstrapping(): void {
        this.generation++;
        this.bids.clear();
        this.asks.clear();
        this.bootstrapping = true;
        this.seeded = false;
        this.ready = false;
        this.lastUpdateId = 0;
        this.lastU = 0;
        this._needsSnapshot = true;
    }

    parse(data: AsterRawBookMessage): NormalizedOrderBook | null {
        const symbol = typeof data?.s === 'string' ? data.s : '';
        if (!symbol || symbol !== this.currentSymbol) return null;

        if (this.bootstrapping) {
            if (this.pendingUpdates.length >= MAX_PENDING_UPDATES) {
                this.pendingUpdates.shift();
            }
            this.pendingUpdates.push(data);
            return null;
        }

        if (this.seeded) {
            if (data.u < this.lastUpdateId + 1) return null;
            if (data.U > this.lastUpdateId + 1) {
                this.enterBootstrapping();
                this.pendingUpdates.push(data);
                return null;
            }
            this.seeded = false;
            this.ready = true;
            this.applyLevels(this.bids, data.b);
            this.applyLevels(this.asks, data.a);
            this.lastU = data.u;
            return this.buildSnapshot(symbol, data.E || Date.now());
        }

        if (!this.ready) return null;

        try {
            if (data.pu !== this.lastU) {
                this.enterBootstrapping();
                this.pendingUpdates.push(data);
                return null;
            }
            if (Array.isArray(data?.b)) this.applyLevels(this.bids, data.b);
            if (Array.isArray(data?.a)) this.applyLevels(this.asks, data.a);
            this.lastU = data.u;
            return this.buildSnapshot(symbol, data.E || Date.now());
        } catch (error) {
            logPipelineError('AsterParser.parse', error);
            return null;
        }
    }

    private applyLevels(map: Map<string, number>, levels: AsterRawLevel[]): void {
        for (const raw of levels) {
            const price = parseFloat(raw[0]);
            const size = parseFloat(raw[1]);
            if (isNaN(price) || price <= 0) continue;
            const key = price.toFixed(CANONICAL_PRICE_DP);
            if (size === 0) {
                map.delete(key);
            } else {
                map.set(key, size);
            }
        }
    }

    private buildSnapshot(symbol: string, lastUpdatedAt: number): NormalizedOrderBook {
        const bids = this.mapToLevels(this.bids);
        const asks = this.mapToLevels(this.asks);
        bids.sort((a, b) => b.price - a.price);
        asks.sort((a, b) => a.price - b.price);
        return {
            venue: 'aster',
            asset: symbol,
            bids,
            asks,
            lastUpdatedAt,
        };
    }

    private mapToLevels(map: Map<string, number>): OrderBookLevel[] {
        const levels: OrderBookLevel[] = [];
        for (const [priceStr, size] of map) {
            const price = parseFloat(priceStr);
            if (isNaN(price) || price <= 0 || size <= 0) continue;
            levels.push({ price, size, venue: 'aster' });
        }
        return levels;
    }
}
