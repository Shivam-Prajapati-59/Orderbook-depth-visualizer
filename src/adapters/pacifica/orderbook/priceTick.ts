import { isAbortError, logPipelineError } from '@/src/lib/pipelineError';
import { readResponseJson } from '@/src/lib/readResponseJson';

import { INFO_API_URL } from '../constants';
import { PACIFICA_SYMBOL_MAP } from '@/src/config/trademarket';

// Max time (ms) to wait for the Pacifica info REST response
const FETCH_TIMEOUT_MS = 10_000;

// Structure of a single market entry from GET /api/v1/info
type PacificaMarketInfo = {
    symbol: string;
    tick_size: string;
};

// Structure of the full GET /api/v1/info response
type PacificaInfoResponse = {
    success: boolean;
    data: PacificaMarketInfo[];
};

// Global cache to avoid repeated REST requests for the same metadata
let cache: Promise<Map<string, number>> | null = null;

// Fetches market info from Pacifica REST API and builds a symbol -> tick size map
async function loadSymbolToTick(): Promise<Map<string, number>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
        // GET request — Pacifica info endpoint does not require a body
        res = await fetch(`${INFO_API_URL}/info`, {
            method: 'GET',
            signal: controller.signal,
        });
    } catch (error) {
        clearTimeout(timeoutId);
        if (isAbortError(error)) {
            logPipelineError('loadSymbolToTick.network', new Error('Request timed out'));
            throw new Error('Pacifica info: request timed out');
        }
        logPipelineError('loadSymbolToTick.network', error);
        throw new Error(`Pacifica info: network error — ${error}`);
    }

    clearTimeout(timeoutId);

    if (!res.ok) {
        throw new Error(`Pacifica info HTTP ${res.status}`);
    }

    let data: PacificaInfoResponse;
    try {
        const parsed = await readResponseJson(res);
        if (parsed === null) {
            throw new Error('Pacifica info: empty response body');
        }
        data = parsed as PacificaInfoResponse;
    } catch (error) {
        logPipelineError('loadSymbolToTick.json', error);
        throw new Error('Pacifica info: invalid JSON response');
    }

    if (!data.success || !Array.isArray(data.data)) {
        throw new Error('Pacifica info: unexpected response shape');
    }

    const map = new Map<string, number>();
    for (const row of data.data) {
        // tick_size is a decimal string — parse it directly
        if (!row?.symbol || typeof row.tick_size !== 'string') continue;
        const tick = parseFloat(row.tick_size);
        if (Number.isFinite(tick) && tick > 0) {
            map.set(row.symbol, tick);
        }
    }
    return map;
}

// Returns the tick size for a canonical app asset (e.g. 'ETH') using Pacifica symbol names
export async function getPacificaOrderbookTick(canonicalAsset: string): Promise<number | null> {
    const symbol = PACIFICA_SYMBOL_MAP[canonicalAsset];
    if (!symbol) return null;

    try {
        if (!cache) {
            cache = loadSymbolToTick();
        }
        const map = await cache;
        const tick = map.get(symbol);
        return tick != null && tick > 0 ? tick : null;
    } catch (e) {
        // Clear cache on failure so the next call retries
        cache = null;
        logPipelineError('getPacificaOrderbookTick', e);
        return null;
    }
}

// Clears the cached market info, useful for testing or hot-reload scenarios
export function clearPacificaMetaCache(): void {
    cache = null;
}
