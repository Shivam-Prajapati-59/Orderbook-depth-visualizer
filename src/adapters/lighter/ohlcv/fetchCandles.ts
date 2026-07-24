import type { OhlcvBar } from './types';
import { isAbortError, logPipelineError } from '@/src/lib/pipelineError';
import { readResponseJson } from '@/src/lib/readResponseJson';

import { CANDLES_HTTP_PATH, REST_API_ORIGIN } from '../constants';
import { parseLighterCandlesResponseBody } from './parseCandleResponse';

// Parameters required to fetch historical candles from Lighter
export type fetchCandlesParams = {
    marketId: number;
    resolution: string;
    rangeStartMs: number;
    rangeEndMs: number;
    maxBars: number;
    signal?: AbortSignal;
}

// Constructs the full URL with query parameters for the Lighter candles endpoint
function buildCandlesRequestUrl(input: fetchCandlesParams): string {
    const url = new URL(CANDLES_HTTP_PATH, `${REST_API_ORIGIN}/`);
    url.searchParams.set('market_id', String(input.marketId));
    url.searchParams.set('resolution', input.resolution);
    url.searchParams.set('start_timestamp', String(Math.floor(input.rangeStartMs)));
    url.searchParams.set('end_timestamp', String(Math.floor(input.rangeEndMs)));
    url.searchParams.set('count_back', String(Math.floor(input.maxBars)));
    return url.toString();
}

// Fetches historical OHLCV candles from the Lighter REST API
export async function fetchCandles(params: fetchCandlesParams): Promise<OhlcvBar[]> {
    let response: Response;
    try {
        response = await fetch(buildCandlesRequestUrl(params), {
            method: 'GET',
            signal: params.signal,
        });
    } catch (error) {
        if (isAbortError(error)) {
            throw error;
        }
        logPipelineError('fetchLighterCandles.network', error);
        throw new Error(`Lighter candles: network error — ${error}`);
    }
    if (!response.ok) {
        const msg = `Lighter candles request failed: HTTP ${response.status} ${response.statusText}`;
        logPipelineError('fetchLighterCandles.http', new Error(msg));
        throw new Error(msg);
    }

    let data: unknown;
    try {
        data = await readResponseJson(response);
    } catch (error) {
        logPipelineError('fetchLighterCandles.response', error);
        throw new Error(`Lighter candles: response parse error — ${error}`);
    }

    if (data === null) {
        return [];
    }
    return parseLighterCandlesResponseBody(data);

}