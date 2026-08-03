import { useQuery } from "@tanstack/react-query";
import { useEffect, useLayoutEffect } from "react";

import { isTradableAsset } from "@/src/config/trademarket";

import type { OhlcvTimeframe } from "../timeframe";
import { lighterCandlesPollQueryOptions } from "../lib/ohlcvChartQueries";
import { useLighterCandlesStore } from "../store/lighterCandlesStore";

type UseLighterCandlesPollOptions = {
  asset: string;
  timeframe: OhlcvTimeframe;
  enabled: boolean;
};

/**
 * Polls Lighter OHLCV candles over REST for a tradable asset.
 *
 * Lighter has no candle WebSocket in this app, so updates arrive via a TanStack
 * Query `refetchInterval` poll instead of a live stream:
 * - The query is enabled only while `enabled` and the asset is tradable.
 * - Each poll resolves fresh bars, which are upserted into `useLighterCandlesStore`.
 * - The store buffer is cleared whenever `enabled`, `asset`, or `timeframe`
 *   changes, dropping stale candles from a previous instrument/timeframe.
 *
 * Returns the underlying `candlesQuery` for callers that need loading/error state.
 */
export function useLighterCandlesPoll({
  asset,
  timeframe,
  enabled,
}: UseLighterCandlesPollOptions) {
  const shouldPoll = enabled && isTradableAsset(asset);
  const candlesQuery = useQuery(
    lighterCandlesPollQueryOptions({
      asset,
      timeframe,
      enabled,
    }),
  );

  useLayoutEffect(() => {
    useLighterCandlesStore.getState().clear();
  }, [enabled, asset, timeframe]);
  useEffect(() => {
    if (!shouldPoll) {
      return;
    }
    if (candlesQuery.isError) {
      useLighterCandlesStore.getState().setConnection({
        venue: "lighter",
        status: "error",
        errorMessage:
          candlesQuery.error?.message ?? "Failed to load candle history",
        reconnectAttempts: 0,
      });
      return;
    }
    if (!candlesQuery.isSuccess || !candlesQuery.data?.length) {
      return;
    }
    useLighterCandlesStore.getState().upsertBars(candlesQuery.data);
  }, [
    shouldPoll,
    candlesQuery.isSuccess,
    candlesQuery.isError,
    candlesQuery.data,
  ]);
}
