import type { UTCTimestamp } from "lightweight-charts";

export type VenueId = "hyperliquid" | "lighter" | "pacifica" | "aster";
export type OhlcvTimeframe = "1m" | "5m" | "15m" | "1h";
export type OhlcvChartMode = "candles" | "compare";

export type OhlcvBar = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
