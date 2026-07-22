
import { logPipelineError } from '@/src/lib/pipelineError';
import { readResponseJson } from '@/src/lib/readResponseJson';

import { INFO_API_URL } from '../constants';
import { HYPERLIQUID_SYMBOL_MAP } from '@/src/config/trademarket';

// The maximum number of decimals allowed for perpetual contracts
const PERP_MAX_DECIMALS = 6;

// Structure of a universe entry returned by the HL meta API
type MetaUniverseEntry = { name: string; szDecimals: number };

// Global cache to prevent fetching the meta endpoint multiple times
let cache: Promise<Map<string, number>> | null = null;

// Calculates the tick size (minimum price step) based on szDecimals
function tickFromSzDecimals(szDecimals: number): number {
    const priceDecimals = Math.max(0, PERP_MAX_DECIMALS - szDecimals);
    return 10 ** -priceDecimals;
}

// Fetches the universe metadata from HL REST API and maps coins to their tick sizes
async function loadCoinToTick(): Promise<Map<string, number>> {
    let res: Response;
    try {
        res = await fetch(INFO_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'meta' }),
        });
    } catch (error) {
        logPipelineError('loadCoinToTick.network', error);
        throw new Error(`Hyperliquid meta: network error — ${error}`);
    }
    if (!res.ok) {
        throw new Error(`Hyperliquid meta HTTP ${res.status}`);
    }
    let data: { universe?: MetaUniverseEntry[] };
    try {
        const parsed = await readResponseJson(res);
        if (parsed === null) {
            throw new Error('Hyperliquid meta: empty response body');
        }
        data = parsed as { universe?: MetaUniverseEntry[] };
    } catch (error) {
        logPipelineError('loadCoinToTick.json', error);
        throw new Error('Hyperliquid meta: invalid JSON response');
    }
    const map = new Map<string, number>();
    for (const row of data.universe ?? []) {
        if (row?.name == null || typeof row.szDecimals !== 'number') continue;
        map.set(row.name, tickFromSzDecimals(row.szDecimals));
    }
    return map;
}

// Public method to get the tick size for a canonical app asset (e.g. ETH)
export async function getHyperliquidOrderbookTick(canonicalAsset: string): Promise<number | null> {
    const coin = HYPERLIQUID_SYMBOL_MAP[canonicalAsset];
    if (!coin) return null;

    try {
        if (!cache) {
            cache = loadCoinToTick();
        }
        const map = await cache;
        const tick = map.get(coin);
        return tick != null && tick > 0 ? tick : null;
    } catch (e) {
        logPipelineError('getHyperliquidOrderbookTick', e);
        return null;
    }
}

// Test / hot reload: clear cached meta.
export function clearHyperliquidMetaCache(): void {
    cache = null;
}