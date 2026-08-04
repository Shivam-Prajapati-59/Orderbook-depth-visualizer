import { useQuery } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef } from "react";

import { HyperliquidCandlesClient } from "@/src/adapters/hyperliquid/ohlcv/candleClient";
import {
  HYPERLIQUID_SYMBOL_MAP,
  isTradableAsset,
  type TradableAsset,
} from "@/src/config/trademarket";

import { hyperliquidCandleInterval, type OhlcvTimeframe } from "../timeframe";
import { hyperliquidCandleHistoryQueryOptions } from "../lib/ohlcvChartQueries";
import { useHyperliquidCandlesStore } from "../store/hyperLiquidCandlesStore";

type UseHyperliquidCandlesStreamOptions = {
  asset: string;
  timeframe: OhlcvTimeframe;
  enabled: boolean;
};

/**
 * Powers live Hyperliquid OHLCV candles for a tradable asset.
 *
 * Responsibilities:
 * - Fetches historical candles through React Query when the asset/timeframe changes.
 * - Clears the venue store whenever `enabled`, `asset`, or `timeframe` changes
 *   so stale bars of a previous instrument/timeframe never leak into the new view.
 * - Opens a live WebSocket client and sinks both incoming bars (upsert) and the
 *   connection status into `useHyperliquidCandlesStore`.
 *
 * The socket is torn down on `enabled === false`, non-tradable asset, or unmount.
 * History is upserted before the socket attaches and is preserved across
 * re-subscribes (the socket cleanup does not wipe the store).
 */
export function useHyperliquidCandlesStream({
  asset,
  timeframe,
  enabled,
}: UseHyperliquidCandlesStreamOptions): void {
  const clientRef = useRef<HyperliquidCandlesClient | null>(null);

  const shouldFetchHistory = enabled && isTradableAsset(asset);

  const historyQuery = useQuery(
    hyperliquidCandleHistoryQueryOptions({
      asset,
      timeframe,
      enabled,
    }),
  );

  useLayoutEffect(() => {
    if (!enabled || !isTradableAsset(asset)) {
      useHyperliquidCandlesStore.getState().clear();
      return;
    }
    useHyperliquidCandlesStore.getState().clear();
  }, [enabled, asset, timeframe]);
  useEffect(() => {
    if (!shouldFetchHistory) {
      return;
    }
    if (historyQuery.isError) {
      useHyperliquidCandlesStore.getState().setConnection({
        venue: "hyperliquid",
        status: "error",
        errorMessage:
          historyQuery.error?.message ?? "Failed to load candle history",
        reconnectAttempts: 0,
      });
      return;
    }
    if (!historyQuery.isSuccess || !historyQuery.data?.length) {
      return;
    }
    useHyperliquidCandlesStore.getState().upsertBars(historyQuery.data);
  }, [
    shouldFetchHistory,
    historyQuery.isSuccess,
    historyQuery.isError,
    historyQuery.error,
    historyQuery.data,
  ]);

  useEffect(() => {
    if (!enabled) {
      clientRef.current?.destroy();
      clientRef.current = null;
      return;
    }

    if (!isTradableAsset(asset)) {
      return;
    }

    const ta = asset as TradableAsset;
    const { upsertBars, setConnection } = useHyperliquidCandlesStore.getState();
    const interval = hyperliquidCandleInterval(timeframe);

    const client = new HyperliquidCandlesClient(HYPERLIQUID_SYMBOL_MAP);
    clientRef.current = client;

    client.connect(
      (bars) => upsertBars(bars),
      (state) => setConnection(state),
    );
    client.subscribe(ta, interval);

    return () => {
      client.destroy();
      if (clientRef.current === client) {
        clientRef.current = null;
      }
    };
  }, [asset, enabled, timeframe]);
}
