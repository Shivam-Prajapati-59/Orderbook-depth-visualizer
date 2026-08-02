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
import { useHyperliquidCandlesStore } from "../store/hyperLiquidCandleStore";

type UseHyperliquidCandlesStreamOptions = {
  asset: string;
  timeframe: OhlcvTimeframe;
  enabled: boolean;
};

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
    if (!historyQuery.isSuccess || !historyQuery.data?.length) {
      return;
    }
    useHyperliquidCandlesStore.getState().upsertBars(historyQuery.data);
  }, [shouldFetchHistory, historyQuery.isSuccess, historyQuery.data]);

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
