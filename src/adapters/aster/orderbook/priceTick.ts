import { isAbortError, logPipelineError } from '@/src/lib/pipelineError';
import { INFO_API_URL } from '../constants';

// Fetches the PRICE_FILTER tickSize from the Aster /fapi/v1/exchangeInfo endpoint
// Returns the tick size for the given asset, or null on failure
export async function getAsterOrderbookTick(
    asset: string,
    signal?: AbortSignal,
): Promise<number | null> {
    // Aster symbol format is asset + 'USDT' (e.g. 'BTC' -> 'BTCUSDT')
    const symbol = `${asset}USDT`;

    let response: Response;
    try {
        response = await fetch(`${INFO_API_URL}/fapi/v1/exchangeInfo`, { signal });
    } catch (error) {
        if (isAbortError(error)) throw error;
        logPipelineError('getAsterOrderbookTick.network', error);
        return null;
    }

    if (!response.ok) {
        logPipelineError('getAsterOrderbookTick.http', new Error(`HTTP ${response.status}`));
        return null;
    }

    let data: unknown;
    try {
        data = await response.json();
    } catch (error) {
        logPipelineError('getAsterOrderbookTick.json', error);
        return null;
    }

    try {
        const info = data as { symbols: Array<{ symbol: string; filters: Array<{ filterType: string; tickSize?: string }> }> };
        const symbolInfo = info.symbols.find((s) => s.symbol === symbol);
        if (!symbolInfo) {
            console.warn(`[AsterPriceTick] Symbol not found: ${symbol}`);
            return null;
        }

        // Find the PRICE_FILTER filter entry
        const priceFilter = symbolInfo.filters.find((f) => f.filterType === 'PRICE_FILTER');
        if (!priceFilter?.tickSize) {
            console.warn(`[AsterPriceTick] PRICE_FILTER missing for ${symbol}`);
            return null;
        }

        const tick = parseFloat(priceFilter.tickSize);
        return isFinite(tick) && tick > 0 ? tick : null;
    } catch (error) {
        logPipelineError('getAsterOrderbookTick.parse', error);
        return null;
    }
}
