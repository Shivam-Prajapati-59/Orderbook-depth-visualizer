import type { UTCTimestamp } from 'lightweight-charts';


// {
//   "channel": "candle",
//   "data": {
//     "t": 1749052260000,
//     "T": 1749052320000,
//     "s": "SOL",
//     "i": "1m",
//     "o": "157.3",
//     "c": "157.32",
//     "h": "157.32",
//     "l": "157.3",
//     "v": "1.22",
//     "n": 8
//   }
// }

export type PacificaWsCandle = {
    t: number;
    T: number;
    s: string;
    i: string;
    o: number | string;
    c: number | string;
    h: number | string;
    l: number | string;
    v: number | string;
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

export type PacificaCandleChannelMessage = {
    channel: 'candle';
    data: PacificaWsCandle | PacificaWsCandle[];
};