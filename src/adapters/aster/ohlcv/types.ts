import type { UTCTimestamp } from 'lightweight-charts';

// Represents a single OHLCV bar in our normalized format
export type OhlcvBar = {
    // Candle open time in seconds (lightweight-charts requires seconds)
    time: UTCTimestamp;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
};

// Aster kline REST response row: array of 12 elements
// [openTime, open, high, low, close, volume, closeTime, quoteVol, trades, takerBaseVol, takerQuoteVol, ignore]
export type AsterRestKlineRow = [
    number,  // open time (ms)
    string,  // open
    string,  // high
    string,  // low
    string,  // close
    string,  // volume
    number,  // close time (ms)
    string,  // quote asset volume
    number,  // number of trades
    string,  // taker buy base volume
    string,  // taker buy quote volume
    string,  // ignore
];

// Inner kline object from the Aster WebSocket kline stream event
export interface AsterWsKlineData {
    // Kline start time in milliseconds
    t: number;
    // Kline close time in milliseconds
    T: number;
    // Symbol
    s: string;
    // Interval string
    i: string;
    // Open price
    o: string;
    // Close price
    c: string;
    // High price
    h: string;
    // Low price
    l: string;
    // Base asset volume
    v: string;
    // Quote asset volume
    q: string;
    // Number of trades
    n: number;
    // Taker buy base asset volume
    V: string;
    // Taker buy quote asset volume
    Q: string;
    // Is this kline closed?
    x: boolean;
}

// Full WebSocket event message wrapper for an Aster kline event
export interface AsterWsKlineEvent {
    // Event type — always 'kline'
    e: 'kline';
    // Event time in milliseconds
    E: number;
    // Symbol (e.g. 'BTCUSDT')
    s: string;
    // The nested kline data object
    k: AsterWsKlineData;
}
