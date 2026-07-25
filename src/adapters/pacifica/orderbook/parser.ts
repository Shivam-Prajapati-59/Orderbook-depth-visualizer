import { NormalizedOrderBook, OrderBookLevel } from '../../base/types';
import { logPipelineError } from '@/src/lib/pipelineError';

import { PacificaOrderBookData, PacificaRawLevel } from './types';

// Helper to return an empty book if parsing fails
function emptyBook(symbol: string): NormalizedOrderBook {
    return {
        venue: 'pacifica',
        asset: symbol,
        bids: [],
        asks: [],
        lastUpdatedAt: Date.now(),
    };
}

// Type guard to check if the raw level is a valid PacificaRawLevel object
function isPacificaRawLevel(level: unknown): level is PacificaRawLevel {
    return (
        level !== null &&
        typeof level === 'object' &&
        !Array.isArray(level) &&
        'p' in (level as object) &&
        'a' in (level as object) &&
        'n' in (level as object)
    );
}

// Parses a single raw level into an OrderBookLevel, returns null if invalid
function parseLevel(rawLevel: PacificaRawLevel): OrderBookLevel | null {
    const price = parseFloat(rawLevel.p);
    const size = parseFloat(rawLevel.a);
    const count = Number(rawLevel.n);

    if (!Number.isFinite(price) || !Number.isFinite(size) || !Number.isFinite(count)) return null;
    if (price <= 0 || size <= 0 || count <= 0) return null;

    return {
        price,
        size,
        venue: 'pacifica',
    };
}

// Converts an array of raw Pacifica levels into validated OrderBookLevel[]
function parseLevels(rawLevels: unknown[]): OrderBookLevel[] {
    const out: OrderBookLevel[] = [];

    for (const rawLevel of rawLevels) {
        if (!isPacificaRawLevel(rawLevel)) continue;

        const level = parseLevel(rawLevel);
        if (level !== null) out.push(level);
    }

    return out;
}

export class PacificaParser {
    // Parses a full Pacifica book snapshot into a NormalizedOrderBook
    // Pacifica always sends full snapshots — no incremental diff logic needed
    parse(data: PacificaOrderBookData): NormalizedOrderBook {
        const coin = typeof data?.s === 'string' ? data.s : '';

        try {
            if (
                !data?.l ||
                !Array.isArray(data.l) ||
                data.l.length < 2 ||
                !Array.isArray(data.l[0]) ||
                !Array.isArray(data.l[1])
            ) {
                return emptyBook(coin);
            }

            const [rawBids, rawAsks] = data.l;

            const bids = parseLevels(rawBids);
            const asks = parseLevels(rawAsks);

            // Bids: highest price first (descending). Asks: lowest price first (ascending).
            bids.sort((a, b) => b.price - a.price);
            asks.sort((a, b) => a.price - b.price);

            return {
                venue: 'pacifica',
                asset: coin,
                bids,
                asks,
                // Use data.t if it's a valid number, otherwise fall back to now
                lastUpdatedAt: Number.isFinite(data.t) && data.t > 0 ? data.t : Date.now(),
            };
        } catch (error) {
            logPipelineError('PacificaParser.parse', error);
            return emptyBook(coin);
        }
    }
}
