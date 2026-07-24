import type { UTCTimestamp } from 'lightweight-charts';
import type { OhlcvBar } from './types';


// Type guard to ensure the value is a standard object
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

// Parses a value into a finite number, returning null if invalid
function asFiniteNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}


// Normalizes a single raw Lighter candle row into a standard OhlcvBar
export function lighterCandleRowToBar(row: unknown): OhlcvBar | null {
    if (!isPlainObject(row)) {
        return null;
    }

    const openTimeMs = asFiniteNumber(row.t);
    if (openTimeMs === null) {
        return null;
    }

    const open = asFiniteNumber(row.o);
    const high = asFiniteNumber(row.h);
    const low = asFiniteNumber(row.l);
    const close = asFiniteNumber(row.c);
    if (open === null || high === null || low === null || close === null) {
        return null;
    }

    const baseVolume = asFiniteNumber(row.v) ?? 0;

    return {
        time: Math.floor(openTimeMs / 1000) as UTCTimestamp,
        open,
        high,
        low,
        close,
        volume: baseVolume,
    };
}
