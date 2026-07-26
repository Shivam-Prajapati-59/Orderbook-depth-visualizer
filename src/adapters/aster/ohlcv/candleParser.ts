import type { UTCTimestamp } from 'lightweight-charts';
import type { OhlcvBar, AsterRestKlineRow, AsterWsKlineData } from './types';
import { logPipelineError } from '@/src/lib/pipelineError';

// Type guard for a plain non-null non-array object
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Safely parses a string or number into a finite float, returns null on failure
function parseFiniteNumber(raw: unknown): number | null {
    const n = typeof raw === 'number' ? raw : parseFloat(raw as string);
    return isFinite(n) ? n : null;
}

// Normalizes a single Aster REST kline row into our OhlcvBar format
export function normalizeAsterRestKline(row: unknown): OhlcvBar | null {
    try {
        if (!Array.isArray(row) || row.length < 6) return null;

        const [openTimeMs, openRaw, highRaw, lowRaw, closeRaw, volumeRaw] = row as AsterRestKlineRow;

        const timeS = typeof openTimeMs === 'number' ? Math.floor(openTimeMs / 1000) : null;
        const open = parseFiniteNumber(openRaw);
        const high = parseFiniteNumber(highRaw);
        const low = parseFiniteNumber(lowRaw);
        const close = parseFiniteNumber(closeRaw);
        const volume = parseFiniteNumber(volumeRaw);

        if (timeS === null || open === null || high === null || low === null || close === null) {
            return null;
        }

        return {
            time: timeS as UTCTimestamp,
            open,
            high,
            low,
            close,
            volume: volume ?? 0,
        };
    } catch (error) {
        logPipelineError('normalizeAsterRestKline', error);
        return null;
    }
}

// Normalizes an array of Aster REST kline rows into OhlcvBar[]
export function normalizeAsterRestKlines(rows: unknown): OhlcvBar[] {
    try {
        if (!Array.isArray(rows)) return [];
        return rows.map(normalizeAsterRestKline).filter((b): b is OhlcvBar => b !== null);
    } catch (err) {
        logPipelineError('normalizeAsterRestKlines', err);
        return [];
    }
}

// Normalizes a single Aster WebSocket kline inner data object into OhlcvBar
export function normalizeAsterWsKline(data: unknown): OhlcvBar | null {
    try {
        if (!isPlainObject(data)) return null;

        const k = data as unknown as AsterWsKlineData;

        const timeS = typeof k.t === 'number' ? Math.floor(k.t / 1000) : null;
        const open = parseFiniteNumber(k.o);
        const high = parseFiniteNumber(k.h);
        const low = parseFiniteNumber(k.l);
        const close = parseFiniteNumber(k.c);
        const volume = parseFiniteNumber(k.v);

        if (timeS === null || open === null || high === null || low === null || close === null) {
            return null;
        }

        return {
            time: timeS as UTCTimestamp,
            open,
            high,
            low,
            close,
            volume: volume ?? 0,
        };
    } catch (error) {
        logPipelineError('normalizeAsterWsKline', error);
        return null;
    }
}
