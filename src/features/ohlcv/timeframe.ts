export type OhlcvTimeframe = "1m" | "5m" | "15m" | "1h";

export const ohlcvTimeframes: OhlcvTimeframe[] = ["1m", "5m", "15m", "1h"];

//  Bar length in seconds
export const TIMEFRAME_BAR_SECONDS: Record<OhlcvTimeframe, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
};

export function timeframeBarSeconds(tf: OhlcvTimeframe): number {
  return TIMEFRAME_BAR_SECONDS[tf];
}

export function hyperliquidCandleInterval(tf: OhlcvTimeframe): string {
  return tf;
}

export function lighterCandleResolution(tf: OhlcvTimeframe): string {
  return tf;
}

export function pacificaCandleInterval(tf: OhlcvTimeframe): string {
  return tf;
}
export function asterCandleInterval(tf: OhlcvTimeframe): string {
  return tf;
}

/** Lighter REST candle polling (TanStack Query `refetchInterval`). Same for all UI timeframes. */
const LIGHTER_CANDLES_POLL_MS = 2_000;

/** Refetch interval for Lighter REST candles (there is no candle WebSocket in this app). */
export function lighterCandlesPollIntervalMs(
  _timeframe: OhlcvTimeframe,
): number {
  return LIGHTER_CANDLES_POLL_MS;
}
