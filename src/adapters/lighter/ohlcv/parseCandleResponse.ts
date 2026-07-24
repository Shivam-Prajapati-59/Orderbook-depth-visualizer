import type { OhlcvBar } from './types';
import { logPipelineError } from '@/src/lib/pipelineError';

import { lighterCandleRowToBar } from './candleRowParser';

// Type guard to ensure the value is a standard object
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

// Parses the raw JSON response from Lighter's candles API into an array of OhlcvBars
export function parseLighterCandlesResponseBody(payload: unknown): OhlcvBar[] {
    try {

        if (!isPlainObject(payload)) {
            return [];
        }

        if (payload.code !== 200) {
            const msg = (payload as Record<string, unknown>).error ?? (payload as Record<string, unknown>).msg ?? `API returned code ${payload.code}`;
            throw new Error(`Lighter candles: ${msg}`);
        }

        const rows = payload.c;

        if (!Array.isArray(rows)) {
            return [];
        }


        const bars: OhlcvBar[] = [];
        for (const row of rows) {
            const bar = lighterCandleRowToBar(row);
            if (bar !== null) {
                bars.push(bar);
            }
        }

        return bars.sort((left, right) => left.time - right.time);

    } catch (error) {
        logPipelineError('parseLighterCandlesResponseBody', error);
        if (error instanceof Error && error.message.startsWith('Lighter candles:')) {
            throw error;
        }
        return [];
    }
}