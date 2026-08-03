import { useQuery } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef } from "react";

import { AsterCandlesClient } from "@/src/adapters/aster/ohlcv/candleClient";
import {
  ASTER_SYMBOL_MAP,
  isTradableAsset,
  type TradableAsset,
} from "@/src/config/trademarket";

import { asterCandleInterval, type OhlcvTimeframe } from "../timeframe";
import { asterCandleHistoryQueryOptions } from "../lib/ohlcvChartQueries";
import { useAsterCandlesStore } from "../store/asterCandlesStore";

type UseAsterCandlesStreamOptions = {
  asset: string;
  timeframe: OhlcvTimeframe;
  enabled: boolean;
};

/**
 * Streams live Aster OHLCV candles for a tradable asset.
 *
 * Responsibilities:
 * - Fetches historical candles via React Query when the asset/timeframe changes.
 * - Clears the store bid whenever `enabled`, `asset`, or `timeframe` changes,
 *   discarding stale bars from a previous instrument/timeframe.
 * - Opens a live WebSocket client and upserts incoming bars plus the connection
 *   status into `useAsterCandlesStore`.
 *
 * The socket is destroyed when disabled, the asset becomes non-tradable, or the
 * hook unmounts. Historical bars are upserted before the socket connects and are
 * preserved across re-subscribes (the socket teardown does not clear the store).
 */
export function useAsterCandlesStream({
  asset,
  timeframe,
  enabled,
}: UseAsterCandlesStreamOptions): void {
  const clientRef = useRef<AsterCandlesClient | null>(null);

  const shouldFetchHistory = enabled && isTradableAsset(asset);

  const historyQuery = useQuery(
    asterCandleHistoryQueryOptions({
      asset,
      timeframe,
      enabled,
    }),
  );

  useLayoutEffect(() => {
    if (!enabled || !isTradableAsset(asset)) {
      useAsterCandlesStore.getState().clear();
      return;
    }
    useAsterCandlesStore.getState().clear();
  }, [enabled, asset, timeframe]);

  useEffect(() => {
    if (!shouldFetchHistory) {
      return;
    }
    if (historyQuery.isError) {
      useAsterCandlesStore.getState().setConnection({
        venue: "aster",
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
    useAsterCandlesStore.getState().upsertBars(historyQuery.data);
  }, [
    shouldFetchHistory,
    historyQuery.isSuccess,
    historyQuery.isError,
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
    const { upsertBars, setConnection } = useAsterCandlesStore.getState();
    const interval = asterCandleInterval(timeframe);

    const client = new AsterCandlesClient(ASTER_SYMBOL_MAP);
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
