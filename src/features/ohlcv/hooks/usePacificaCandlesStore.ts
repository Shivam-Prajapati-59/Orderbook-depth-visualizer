import { useQuery } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef } from "react";

import {
  PACIFICA_SYMBOL_MAP,
  isTradableAsset,
  type TradableAsset,
} from "@/src/config/trademarket";

import { pacificaCandleInterval, type OhlcvTimeframe } from "../timeframe";
import { pacificaCandleHistoryQueryOptions } from "../lib/ohlcvChartQueries";
import { usePacificaCandlesStore } from "../store/pacificaCandlesStore";
import { PacificaCandlesClient } from "@/src/adapters/pacifica/ohlcv/candleClient";

type UsePacificaCandlesStreamOptions = {
  asset: string;
  timeframe: OhlcvTimeframe;
  enabled: boolean;
};

/**
 * Streams live Pacifica OHLCV candles for a tradable asset.
 *
 * Responsibilities:
 * - Fetches historical candles via React Query when the asset/timeframe changes.
 * - Clears the store buffer whenever `enabled`, `asset`, or `timeframe` changes,
 *   discarding stale candles from a previous instrument/timeframe.
 * - Opens a live WebSocket client and upserts incoming bars plus the connection
 *   status into `usePacificaCandlesStore`.
 *
 * The socket is destroyed on disable, non-tradable asset, or unmount. Historical
 * bars are upserted before the socket connects and survive re-subscribes (socket
 * teardown never clears the store).
 */
export function usePacificaCandlesStream({
  asset,
  timeframe,
  enabled,
}: UsePacificaCandlesStreamOptions): void {
  const clientRef = useRef<PacificaCandlesClient | null>(null);

  const shouldFetchHistory = enabled && isTradableAsset(asset);

  const historyQuery = useQuery(
    pacificaCandleHistoryQueryOptions({
      asset,
      timeframe,
      enabled,
    }),
  );

  useLayoutEffect(() => {
    if (!enabled || !isTradableAsset(asset)) {
      usePacificaCandlesStore.getState().clear();
      return;
    }
    usePacificaCandlesStore.getState().clear();
  }, [enabled, asset, timeframe]);

  useEffect(() => {
    if (!shouldFetchHistory) {
      return;
    }
    if (historyQuery.isError) {
      usePacificaCandlesStore.getState().setConnection({
        venue: "pacifica",
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
    usePacificaCandlesStore.getState().upsertBars(historyQuery.data);
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
    const { upsertBars, setConnection } = usePacificaCandlesStore.getState();
    const interval = pacificaCandleInterval(timeframe);

    const client = new PacificaCandlesClient(PACIFICA_SYMBOL_MAP);
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
  }, [enabled, asset, timeframe]);
}
