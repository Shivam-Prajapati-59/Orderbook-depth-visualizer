import { NormalizedOrderBook, OrderBookLevel } from '../../base/types';
import { logPipelineError } from '@/src/lib/pipelineError';

import { HyperliquidBookData, HyperliquidRawLevel } from './types';

// Helper to return an empty book if parsing fails
function emptyBook(coin: string): NormalizedOrderBook {
    return {
        venue: 'hyperliquid',
        asset: coin,
        bids: [],
        asks: [],
        lastUpdatedAt: Date.now(),
    };
}


// Type guard to check if the raw level is an object (px, sz, n)
function isWsLevelObject(raw: HyperliquidRawLevel): raw is { px: string; sz: string; n: number } {
    return (
        raw !== null && typeof raw === 'object' && !Array.isArray(raw) && 'px' in raw && 'sz' in raw
    );
}

// Parses a single raw HL level into our standard OrderBookLevel
function parseLevel(rawLevel: HyperliquidRawLevel): OrderBookLevel | null {
    let price: number;
    let size: number;

    if (isWsLevelObject(rawLevel)) {
        price = parseFloat(rawLevel.px);
        size = parseFloat(rawLevel.sz);
    } else {
        price = parseFloat(rawLevel[0]);
        size = parseFloat(rawLevel[1]);
    }

    if (isNaN(price) || isNaN(size) || price <= 0 || size <= 0) return null;

    return {
        price,
        size,
        venue: 'hyperliquid',
    };
}

// Parses an array of raw levels, filtering out any invalid or zero-size levels
function parseLevels(rawLevels: HyperliquidRawLevel[]): OrderBookLevel[] {
    const out: OrderBookLevel[] = [];

    for (const rawLevel of rawLevels) {
        const level = parseLevel(rawLevel);

        if (!level) continue;

        if (level.size > 0) out.push(level);
    }

    return out;
}

export class HyperliquidParser {
    // Main entry point to convert HL book data to our NormalizedOrderBook
    parse(data: HyperliquidBookData): NormalizedOrderBook {
        const coin = typeof data?.coin === 'string' ? data.coin : '';

        try {

            if (
                !data?.levels ||
                !Array.isArray(data.levels) ||
                data.levels.length < 2 ||
                !Array.isArray(data.levels[0]) ||
                !Array.isArray(data.levels[1])
            ) {
                return emptyBook(coin);
            }

            const [rawBids, rawAsks] = data.levels;

            const bids = parseLevels(rawBids);
            const asks = parseLevels(rawAsks);

            bids.sort((a, b) => b.price - a.price); // descending
            asks.sort((a, b) => a.price - b.price); // ascending


            return {
                venue: 'hyperliquid',
                asset: coin,
                bids,
                asks,
                lastUpdatedAt: data.time || Date.now(),
            };

        } catch (error) {
            logPipelineError(error, {
                name: 'HyperliquidLevel2Parser.parse',
                coin,
                dataKeys: data ? Object.keys(data) : [],
            });

            return emptyBook(coin);
        }
    }
}