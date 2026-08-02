import type { QueryFunctionContext } from "@tanstack/react-query";

import { fetchHyperliquidCandleHistory } from "@/src/adapters/hyperliquid/ohlcv/candleSnapshot";
import { fetchCandles as fetchLighterCandles } from "@/src/adapters/lighter/ohlcv/fetchCandles";
import { fetchPacificaCandleHistory } from "@/src/adapters/pacifica/ohlcv/candleSnapshot";
import { fetchAsterCandleHistory } from "@/src/adapters/aster/ohlcv/candleSnapshot";
import {
  HYPERLIQUID_SYMBOL_MAP,
  getTradableMarket,
  isTradableAsset,
  type TradableAsset,
} from "@/src/config/trademarket";

import {
  hyperliquidCandleInterval,
  pacificaCandleInterval,
  asterCandleInterval,
  lighterCandleResolution,
  lighterCandlesPollIntervalMs,
  timeframeBarSeconds,
  type OhlcvTimeframe,
} from "../timeframe";
import { ohlcvQueryKeys } from "../queryKeys";

// Bars to request from `candleSnapshot` before live WS (HL allows up to ~5000).
export const HL_HISTORY_BAR_COUNT = 500;

// Bars per Lighter REST request.
export const LIGHTER_BARS_PER_REQUEST = 500;

type ChartQueryBase = {
  asset: string;
  timeframe: OhlcvTimeframe;
  // Parent feature flag (e.g. chart mode + venue).
  enabled: boolean;
};

export function hyperliquidCandleHistoryQueryOptions({
  asset,
  timeframe,
  enabled,
}: ChartQueryBase) {
  const shouldFetchHistory = enabled && isTradableAsset(asset);
  const assetKey = isTradableAsset(asset) ? asset : "__off__";

  return {
    queryKey: ohlcvQueryKeys.hyperliquidCandleHistory(assetKey, timeframe),
    queryFn: async ({ signal }: QueryFunctionContext) => {
      if (!isTradableAsset(asset)) {
        return [];
      }
      const coin = HYPERLIQUID_SYMBOL_MAP[asset as TradableAsset];
      if (!coin) {
        return [];
      }

      const barSeconds = timeframeBarSeconds(timeframe);
      const rangeEndMs = Date.now();
      const rangeStartMs =
        rangeEndMs - HL_HISTORY_BAR_COUNT * barSeconds * 1000;

      return fetchHyperliquidCandleHistory({
        coin,
        interval: hyperliquidCandleInterval(timeframe),
        startTimeMs: rangeStartMs,
        endTimeMs: rangeEndMs,
        signal,
      });
    },
    enabled: shouldFetchHistory,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  };
}

export function pacificaCandleHistoryQueryOptions({
  asset,
  timeframe,
  enabled,
}: ChartQueryBase) {
  const shouldFetchHistory = enabled && isTradableAsset(asset);
  const assetKey = isTradableAsset(asset) ? asset : "__off__";

  return {
    queryKey: ohlcvQueryKeys.pacificaCandleHistory(assetKey, timeframe),
    queryFn: async ({ signal }: QueryFunctionContext) => {
      if (!isTradableAsset(asset)) {
        return [];
      }

      const barSeconds = timeframeBarSeconds(timeframe);
      const rangeEndMs = Date.now();
      const rangeStartMs =
        rangeEndMs - HL_HISTORY_BAR_COUNT * barSeconds * 1000;

      return fetchPacificaCandleHistory({
        symbol: asset,
        interval: pacificaCandleInterval(timeframe),
        start_time: rangeStartMs,
        end_time: rangeEndMs,
        limit: HL_HISTORY_BAR_COUNT,
        signal,
      });
    },
    enabled: shouldFetchHistory,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  };
}

export function asterCandleHistoryQueryOptions({
  asset,
  timeframe,
  enabled,
}: ChartQueryBase) {
  const shouldFetchHistory = enabled && isTradableAsset(asset);
  const assetKey = isTradableAsset(asset) ? asset : "__off__";

  return {
    queryKey: ohlcvQueryKeys.asterCandleHistory(assetKey, timeframe),
    queryFn: async ({ signal }: QueryFunctionContext) => {
      if (!isTradableAsset(asset)) {
        return [];
      }

      const barSeconds = timeframeBarSeconds(timeframe);
      const rangeEndMs = Date.now();
      const rangeStartMs =
        rangeEndMs - HL_HISTORY_BAR_COUNT * barSeconds * 1000;

      return fetchAsterCandleHistory({
        symbol: asset,
        interval: asterCandleInterval(timeframe),
        startTime: rangeStartMs,
        endTime: rangeEndMs,
        limit: HL_HISTORY_BAR_COUNT,
        signal,
      });
    },
    enabled: shouldFetchHistory,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  };
}
export function lighterCandlesPollQueryOptions({
  asset,
  timeframe,
  enabled,
}: ChartQueryBase) {
  const shouldPoll = enabled && isTradableAsset(asset);
  const assetKey = isTradableAsset(asset) ? asset : "__off__";
  const refetchInterval: number | false = shouldPoll
    ? lighterCandlesPollIntervalMs(timeframe)
    : false;

  return {
    queryKey: ohlcvQueryKeys.lighterCandlesPoll(assetKey, timeframe),
    queryFn: async ({ signal }: QueryFunctionContext) => {
      if (!isTradableAsset(asset)) {
        return [];
      }

      const market = getTradableMarket(asset);
      if (!market) {
        return [];
      }

      const barSeconds = timeframeBarSeconds(timeframe);
      const rangeEndMs = Date.now();
      const rangeStartMs =
        rangeEndMs - LIGHTER_BARS_PER_REQUEST * barSeconds * 1000;

      return fetchLighterCandles({
        marketId: market.lighterMarketIndex,
        resolution: lighterCandleResolution(timeframe),
        rangeStartMs,
        rangeEndMs,
        maxBars: LIGHTER_BARS_PER_REQUEST,
        signal,
      });
    },
    enabled: shouldPoll,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchInterval,
    refetchIntervalInBackground: false,
  };
}
