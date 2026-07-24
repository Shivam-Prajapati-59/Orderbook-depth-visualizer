import type { UTCTimestamp } from 'lightweight-charts';

// Standard OHLCV bar format used for chart rendering
export type OhlcvBar = {
    // Unix timestamp in seconds
    time: UTCTimestamp;
    // Open price
    open: number;
    // High price
    high: number;
    // Low price
    low: number;
    // Close price
    close: number;
    // Trading volume
    volume: number;
};