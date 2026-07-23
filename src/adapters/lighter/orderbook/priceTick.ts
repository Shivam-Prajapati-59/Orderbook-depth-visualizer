import { logPipelineError } from '@/src/lib/pipelineError';
import { readResponseJson } from '@/src/lib/readResponseJson';

import { LIGHTER_SYMBOL_MAP } from '@/src/config/trademarket';
import { ORDER_BOOK_DETAILS_PATH, REST_API_ORIGIN } from '../constants';

// Full REST URL to fetch Lighter orderbook details (like price decimals)
const LIGHTER_ORDERBOOK_DETAILS_URL = `${REST_API_ORIGIN}${ORDER_BOOK_DETAILS_PATH}`;

// A single row from the Lighter orderbook details response
type OrderBookDetailRow = {
    symbol?: string;
    price_decimals?: number;
};

// The full response structure for Lighter orderbook details
type OrderBookDetailsResponse = {
    order_book_details?: OrderBookDetailRow[];
};

// Global cache to prevent duplicate REST requests for meta details
let cache: Promise<Map<string, number>> | null = null;

// Fetches symbol metadata from Lighter and builds a map of symbol -> tick size
async function loadSymbolToTick(): Promise<Map<string, number>> {

    if (cache) {
        return cache;
    }
    let res: Response;

    try {
        res = await fetch(LIGHTER_ORDERBOOK_DETAILS_URL);
    } catch (error) {
        logPipelineError('loadSymbolToTick.network', error);
        throw new Error(`Lighter orderBookDetails: network error — ${(error)}`);
    }

    if (!res.ok) {
        throw new Error(`Lighter orderBookDetails HTTP ${res.status}`);
    }

    let data: OrderBookDetailsResponse;

    try {
        const parsed = await readResponseJson(res);
        if (parsed === null) {
            throw new Error('Lighter orderBookDetails: empty response body');
        }
        data = parsed as OrderBookDetailsResponse;
    } catch (err) {
        logPipelineError('loadSymbolToTick.json', err);
        throw new Error('Lighter orderBookDetails: invalid JSON response');
    }

    const map = new Map<string, number>();

    for (const row of data.order_book_details ?? []) {
        const sym = row.symbol;
        const pd = row.price_decimals;
        if (!sym || typeof pd !== 'number' || pd < 0 || pd > 18) continue;
        const tick = 10 ** -pd;
        if (tick > 0) map.set(sym, tick);
    }
    return map;
}

// Price tick for canonical asset (ETH, BTC, …) using Lighter `symbol` names.
export async function getLighterOrderbookTick(canonicalAsset: string): Promise<number | null> {
    const sym = LIGHTER_SYMBOL_MAP[canonicalAsset];
    if (!sym) return null;

    try {
        if (!cache) {
            cache = loadSymbolToTick();
        }
        const map = await cache;
        const tick = map.get(sym);
        return tick != null && tick > 0 ? tick : null;
    } catch (e) {
        cache = null;
        logPipelineError('getLighterOrderbookTick', e);
        return null;
    }
}
// Clears the cache for meta details, useful for hot-reloading
export function clearLighterOrderBookDetailsCache(): void {
    cache = null;
}