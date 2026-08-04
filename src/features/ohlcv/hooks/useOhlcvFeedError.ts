import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import {
  dismissFeedToast,
  feedToastId,
  formatUnknownError,
  toastFeedError,
} from "@/src/lib/feedToast";

import { isTradableAsset } from "@/src/config/trademarket";

import type { OhlcvTimeframe } from "../types";
import {
  asterCandleHistoryQueryOptions,
  hyperliquidCandleHistoryQueryOptions,
  lighterCandlesPollQueryOptions,
  pacificaCandleHistoryQueryOptions,
} from "../lib/ohlcvChartQueries";
import { useHyperliquidCandlesStore } from "../store/hyperLiquidCandlesStore";
import { usePacificaCandlesStore } from "../store/pacificaCandlesStore";
import { useAsterCandlesStore } from "../store/asterCandlesStore";

type UseOhlcvFeedErrorToastsOptions = {
  asset: string;
  timeframe: OhlcvTimeframe;
  hlCandlesEnabled: boolean;
  lighterCandlesEnabled: boolean;
  pacificaCandlesEnabled: boolean;
  asterCandlesEnabled: boolean;
};

/**
 * Surfaces OHLCV history-fetch and WebSocket failures as Sonner feed toasts.
 *
 * Each venue gets its own stable toast id (keyed by asset + timeframe) so a
 * repeated failure never stacks duplicate toasts, and recovery dismisses it.
 * History REST errors and WS connection errors share the per-venue id — the
 * most recent failure wins and is replaced once the feed recovers.
 */
export function useOhlcvFeedErrorToasts(
  options: UseOhlcvFeedErrorToastsOptions,
): void {
  const {
    asset,
    timeframe,
    hlCandlesEnabled,
    lighterCandlesEnabled,
    pacificaCandlesEnabled,
    asterCandlesEnabled,
  } = options;

  const enabledForVenue = (enabled: boolean) =>
    enabled && isTradableAsset(asset);

  const historyQuery = useQuery(
    hyperliquidCandleHistoryQueryOptions({
      asset,
      timeframe,
      enabled: enabledForVenue(hlCandlesEnabled),
    }),
  );

  const lighterCandlesQuery = useQuery(
    lighterCandlesPollQueryOptions({
      asset,
      timeframe,
      enabled: enabledForVenue(lighterCandlesEnabled),
    }),
  );

  const pacificaCandlesQuery = useQuery(
    pacificaCandleHistoryQueryOptions({
      asset,
      timeframe,
      enabled: enabledForVenue(pacificaCandlesEnabled),
    }),
  );

  const asterCandlesQuery = useQuery(
    asterCandleHistoryQueryOptions({
      asset,
      timeframe,
      enabled: enabledForVenue(asterCandlesEnabled),
    }),
  );

  const hlConnection = useHyperliquidCandlesStore((state) => state.connection);
  const pacificaConnection = usePacificaCandlesStore(
    (state) => state.connection,
  );
  const asterConnection = useAsterCandlesStore((state) => state.connection);

  useEffect(() => {
    if (!hlCandlesEnabled || !isTradableAsset(asset)) {
      dismissFeedToast(feedToastId.hlCandlesHistory(asset, timeframe));
      dismissFeedToast(feedToastId.hlCandlesWs(asset, timeframe));
      return;
    }
    const histId = feedToastId.hlCandlesHistory(asset, timeframe);
    const wsId = feedToastId.hlCandlesWs(asset, timeframe);

    if (historyQuery.isError) {
      toastFeedError(
        histId,
        "Hyperliquid candle history failed",
        formatUnknownError(historyQuery.error),
      );
    } else {
      dismissFeedToast(histId);
    }

    if (hlConnection?.status === "error") {
      toastFeedError(
        wsId,
        "Hyperliquid candle stream disconnected",
        hlConnection.errorMessage,
      );
    } else {
      dismissFeedToast(wsId);
    }
  }, [
    hlCandlesEnabled,
    asset,
    timeframe,
    historyQuery.isError,
    historyQuery.error,
    hlConnection,
  ]);

  useEffect(() => {
    if (!lighterCandlesEnabled || !isTradableAsset(asset)) {
      dismissFeedToast(feedToastId.lighterCandles(asset, timeframe));
      return;
    }

    const id = feedToastId.lighterCandles(asset, timeframe);
    if (lighterCandlesQuery.isError) {
      toastFeedError(
        id,
        "Lighter candles request failed",
        formatUnknownError(lighterCandlesQuery.error),
      );
    } else {
      dismissFeedToast(id);
    }
  }, [
    lighterCandlesEnabled,
    asset,
    timeframe,
    lighterCandlesQuery.isError,
    lighterCandlesQuery.error,
  ]);

  useEffect(() => {
    if (!pacificaCandlesEnabled || !isTradableAsset(asset)) {
      dismissFeedToast(feedToastId.pacificCandles(asset, timeframe));
      return;
    }

    const id = feedToastId.pacificCandles(asset, timeframe);
    if (pacificaCandlesQuery.isError) {
      toastFeedError(
        id,
        "Pacifica candle history failed",
        formatUnknownError(pacificaCandlesQuery.error),
      );
    } else if (pacificaConnection?.status === "error") {
      toastFeedError(
        id,
        "Pacifica candle stream disconnected",
        pacificaConnection.errorMessage,
      );
    } else {
      dismissFeedToast(id);
    }
  }, [
    pacificaCandlesEnabled,
    asset,
    timeframe,
    pacificaCandlesQuery.isError,
    pacificaCandlesQuery.error,
    pacificaConnection,
  ]);

  useEffect(() => {
    if (!asterCandlesEnabled || !isTradableAsset(asset)) {
      dismissFeedToast(feedToastId.asterCandles(asset, timeframe));
      return;
    }

    const id = feedToastId.asterCandles(asset, timeframe);
    if (asterCandlesQuery.isError) {
      toastFeedError(
        id,
        "Aster candle history failed",
        formatUnknownError(asterCandlesQuery.error),
      );
    } else if (asterConnection?.status === "error") {
      toastFeedError(
        id,
        "Aster candle stream disconnected",
        asterConnection.errorMessage,
      );
    } else {
      dismissFeedToast(id);
    }
  }, [
    asterCandlesEnabled,
    asset,
    timeframe,
    asterCandlesQuery.isError,
    asterCandlesQuery.error,
    asterConnection,
  ]);
}
