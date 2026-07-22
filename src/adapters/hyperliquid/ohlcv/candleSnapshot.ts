import type { OhlcvBar } from './types';
import { logPipelineError } from '@/src/lib/pipelineError';

import { normalizeHyperliquidCandle } from './candleParser';
import { postInfo } from './infoApi';

// Parameters required to fetch historical candle data
export type HyperliquidCandleHistoryParams = {
    coin: string;
    interval: string;
    startTimeMs: number;
    endTimeMs?: number;
    signal?: AbortSignal;
};

// Internal structure of the JSON payload expected by the Hyperliquid API
type CandleSnapshotRequestBody = {
    type: 'candleSnapshot';
    req: {
        coin: string;
        interval: string;
        startTime: number;
        endTime?: number;
    };
};

// Constructs the precise JSON request body required by Hyperliquid
function buildSnapshotRequestBody(
    params: HyperliquidCandleHistoryParams,
): CandleSnapshotRequestBody {
    const req: CandleSnapshotRequestBody['req'] = {
        coin: params.coin,
        interval: params.interval,
        startTime: params.startTimeMs,
    };
    if (params.endTimeMs != null) {
        req.endTime = params.endTimeMs;
    }
    return { type: 'candleSnapshot', req };
}

// Parses the raw array of historical candles returned by the REST API
function barsFromSnapshotPayload(payload: unknown): OhlcvBar[] {
    try {
        if (!Array.isArray(payload)) {
            return [];
        }

        const bars: OhlcvBar[] = [];
        for (const row of payload) {
            const bar = normalizeHyperliquidCandle(row);
            if (bar !== null) {
                bars.push(bar);
            }
        }

        return bars.sort((left, right) => left.time - right.time);
    } catch (err) {
        logPipelineError('barsFromSnapshotPayload', err);
        return [];
    }
}

// Public method to fetch historical candles (Snapshot) for a given asset
export async function fetchHyperliquidCandleHistory(
    params: HyperliquidCandleHistoryParams,
): Promise<OhlcvBar[]> {
    const payload = await postInfo(buildSnapshotRequestBody(params), {
        signal: params.signal,
    });
    return barsFromSnapshotPayload(payload);
}