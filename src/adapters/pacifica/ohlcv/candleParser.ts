import type { UTCTimestamp } from 'lightweight-charts';
import type { OhlcvBar } from './types';
import { logPipelineError } from '@/src/lib/pipelineError';

// Type guard to ensure the value is a standard object
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

// Parses a value into a finite number, returning null if invalid
function parseFiniteNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

// Normalizes a single raw Pacifica candle object into our standard OhlcvBar format
export function normalizePacificaCandle(record: unknown): OhlcvBar | null {
    try {

        if (!isPlainObject(record)) return null;

        const timeMs = parseFiniteNumber(record.t);
        const open = parseFiniteNumber(record.o);
        const high = parseFiniteNumber(record.h);
        const low = parseFiniteNumber(record.l);
        const close = parseFiniteNumber(record.c);
        const volume = parseFiniteNumber(record.v);

        if (timeMs === null || open === null || high === null || low === null || close === null) {
            return null;
        }

        return {
            time: Math.floor(timeMs / 1000) as UTCTimestamp,
            open,
            high,
            low,
            close,
            volume: volume ?? 0,
        };
    } catch (error) {
        logPipelineError('normalizePacificaCandle', error);
        return null;
    }
}

// Normalizes an array or single item coming directly from the WebSocket channel data
export function normalizePacificaCandlesChannelData(data: unknown): OhlcvBar[] {
    try {
        if (data == null) {
            return [];
        }

        if (Array.isArray(data)) {
            const bars: OhlcvBar[] = [];
            for (const element of data) {
                const bar = normalizePacificaCandle(element);
                if (bar !== null) {
                    bars.push(bar);
                }
            }
            return bars;
        }

        const single = normalizePacificaCandle(data);
        return single !== null ? [single] : [];
    } catch (err) {
        logPipelineError('normalizePacificaCandlesChannelData', err);
        return [];
    }
}