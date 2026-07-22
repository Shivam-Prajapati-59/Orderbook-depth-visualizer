import type { UTCTimestamp } from 'lightweight-charts';

export type HyperliquidWsCandle = {
    // Open timestamp in milliseconds
    t: number;
    // Close timestamp in milliseconds
    T: number;
    // Coin / Symbol (e.g., 'HYPE')
    s: string;
    // Interval / Timeframe (e.g., '1h')
    i: string;
    // Open price 
    o: number | string;
    // Close price 
    c: number | string;
    // High price
    h: number | string;
    // Low price 
    l: number | string;
    // Base asset volume
    v: number | string;
    // Number of trades
    n: number;
}

export type OhlcvBar = {
    time: UTCTimestamp;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
};
export type HyperliquidCandleChannelMessage = {
    channel: 'candle';
    data: HyperliquidWsCandle | HyperliquidWsCandle[];
};
