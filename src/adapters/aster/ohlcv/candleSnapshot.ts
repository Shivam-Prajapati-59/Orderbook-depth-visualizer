import type { OhlcvBar } from './types';
import { isAbortError, logPipelineError } from '@/src/lib/pipelineError';
import { INFO_API_URL } from '../constants';
import { normalizeAsterRestKlines } from './candleParser';

export type AsterCandleHistoryParams = {
    // Aster exchange symbol (e.g. 'BTCUSDT')
    symbol: string;
    // Aster interval string (e.g. '1m', '5m', '1h')
    interval: string;
    // Start time in milliseconds
    startTime: number;
    // Optional end time in milliseconds
    endTime?: number;
    // Optional maximum number of candles (max 1500)
    limit?: number;
    // Optional AbortSignal for request cancellation
    signal?: AbortSignal;
};

// Fetches historical klines from Aster using GET /fapi/v1/klines
export async function fetchAsterCandleHistory(params: AsterCandleHistoryParams): Promise<OhlcvBar[]> {
    const { symbol, interval, startTime, endTime, limit, signal } = params;

    const url = new URL(`${INFO_API_URL}/fapi/v1/klines`);
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('interval', interval);
    url.searchParams.set('startTime', startTime.toString());

    if (endTime !== undefined) {
        url.searchParams.set('endTime', endTime.toString());
    }
    if (limit !== undefined) {
        url.searchParams.set('limit', Math.min(limit, 1500).toString());
    }

    let response: Response;
    try {
        response = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal,
        });
    } catch (error) {
        if (isAbortError(error)) throw error;
        logPipelineError('fetchAsterCandleHistory.network', error);
        throw new Error(`Aster klines: network error — ${error}`);
    }

    if (!response.ok) {
        const msg = `Aster klines request failed: HTTP ${response.status} ${response.statusText}`;
        logPipelineError('fetchAsterCandleHistory.http', new Error(msg));
        throw new Error(msg);
    }

    let data: unknown;
    try {
        data = await response.json();
    } catch (error) {
        if (isAbortError(error)) throw error;
        logPipelineError('fetchAsterCandleHistory.json', error);
        throw new Error('Aster klines: invalid JSON response');
    }

    // The response is a raw array of kline arrays
    return normalizeAsterRestKlines(data);
}
