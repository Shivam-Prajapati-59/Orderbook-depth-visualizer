import type { OhlcvTimeframe } from "./types";

export const ohlcvQueryKeys = {
  hyperliquidCandleHistory: (asset: string, timeframe: OhlcvTimeframe) =>
    ["ohlcv", "hyperliquid", "candle-history", asset, timeframe] as const,

  lighterCandlesPoll: (asset: string, timeframe: OhlcvTimeframe) =>
    ["ohlcv", "lighter", "candles-poll", asset, timeframe] as const,

  pacificaCandleHistory: (asset: string, timeframe: OhlcvTimeframe) =>
    ["ohlcv", "pacifica", "candle-history", asset, timeframe] as const,
  asterCandleHistory: (asset: string, timeframe: OhlcvTimeframe) =>
    ["ohlcv", "aster", "candle-history", asset, timeframe] as const,
};
