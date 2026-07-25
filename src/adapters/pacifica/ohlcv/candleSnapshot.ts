import type { OhlcvBar } from './types';
import { logPipelineError, isAbortError } from '@/src/lib/pipelineError';
import { readResponseJson } from '@/src/lib/readResponseJson';

import { INFO_API_URL } from '../constants';
import { normalizePacificaCandlesChannelData } from './candleParser';

export type PacificaCandleHistoryParams = {
    symbol: string;
    interval: string;
    start_time: number;
    end_time?: number;
    limit?: number;
    signal?: AbortSignal;
};

// Fetches historical candles from Pacifica using their GET /api/v1/kline endpoint
export async function fetchPacificaCandleHistory(params: PacificaCandleHistoryParams): Promise<OhlcvBar[]> {
    const { symbol, interval, start_time, end_time, limit, signal } = params;

    // Construct the query parameters
    const url = new URL(`${INFO_API_URL}/kline`);
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('interval', interval);
    url.searchParams.set('start_time', start_time.toString());

    if (end_time !== undefined) {
        url.searchParams.set('end_time', end_time.toString());
    }

    if (limit !== undefined) {
        url.searchParams.set('limit', limit.toString());
    }

    let response: Response;
    try {
        response = await fetch(url.toString(), {
            method: "GET",
            headers: { 'Accept': '*/*' },
            signal: signal ?? AbortSignal.timeout(10_000),
        });
    } catch (error) {
        if (isAbortError(error)) throw error;
        logPipelineError('fetchPacificaCandleHistory.network', error);
        throw new Error(`Pacifica kline: network error — ${error}`);
    }

    if (!response.ok) {
        const msg = `Pacifica kline request failed: HTTP ${response.status} ${response.statusText}`;
        logPipelineError('fetchPacificaCandleHistory.http', new Error(msg));
        throw new Error(msg);
    }

    let data: unknown;
    try {
        data = await readResponseJson(response);
        if (data === null || typeof data !== 'object' || Array.isArray(data)) {
            throw new Error('JSON is null or not an object');
        }
    } catch (error) {
        if (isAbortError(error)) throw error;
        logPipelineError('fetchPacificaCandleHistory.json', error);
        throw new Error('Pacifica kline: invalid JSON response');
    }

    const responseData = data as Record<string, unknown>;

    // Validate the response format { success: true, data: [...] }
    if (responseData.success !== true || !Array.isArray(responseData.data)) {
        const detail = typeof responseData.error === 'string' ? responseData.error : 'Unexpected API response format';
        const err = new Error(`Pacifica kline: ${detail}`);
        logPipelineError('fetchPacificaCandleHistory.format', err);
        throw err;
    }

    // Reuse the parser we built for WebSockets since the data shape is exactly the same!
    return normalizePacificaCandlesChannelData(responseData.data);
}
