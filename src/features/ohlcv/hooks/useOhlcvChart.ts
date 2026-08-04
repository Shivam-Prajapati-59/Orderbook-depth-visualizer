"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type RefObject,
} from "react";

import type { CompareVenueKey } from "@/src/theme/trading";
import type { OhlcvBar } from "../types";
import {
  applyOhlcvChartData,
  mountOhlcvChart,
  type CompareLineHoverPayload,
  type OhlcvChartBundle,
} from "../lib/ohlcvLightweightChart";
import type { OhlcvChartMode } from "@/src/store/ohlcvSettingsStore";

export type { CompareLineHoverPayload };

export type UseOhlcvChartOptions = {
  onCompareLineHover?: (payload: CompareLineHoverPayload | null) => void;
  /**
   * Identity of the series shown (market + timeframe + candle venue + mode).
   * When this changes, the chart remounts and sync refs reset — required so we never
   * incremental-update 5m bars onto 15m state (or HL onto Lighter) in lightweight-charts.
   */
  chartResetKey: string;
};

const ALL_VENUES: CompareVenueKey[] = [
  "hyperliquid",
  "lighter",
  "pacifica",
  "aster",
];

/**
 * Owns the lightweight-charts lifecycle for the OHLCV panel.
 *
 * - Remounts the chart when `chartResetKey` (market / timeframe / venue / mode)
 *   changes so lightweight-charts never receives foreign bar state.
 * - Feeds candles (single venue) or per-venue compare series into the mounted
 *   chart via `applyOhlcvChartData`, preserving pan/zoom during streaming.
 */
export function useOhlcvChart(
  containerRef: RefObject<HTMLDivElement | null>,
  chartMode: OhlcvChartMode,
  candleBars: OhlcvBar[],
  compareSeries: Partial<Record<CompareVenueKey, OhlcvBar[]>>,
  compareVenues: CompareVenueKey[],
  options: UseOhlcvChartOptions,
): void {
  const onCompareLineHover = options.onCompareLineHover;
  const chartResetKey = options.chartResetKey;

  const bundleRef = useRef<OhlcvChartBundle | null>(null);
  const prevCandlesRef = useRef<OhlcvBar[]>([]);
  const prevCompareRefs = useRef<Record<CompareVenueKey, RefObject<OhlcvBar[]>>>(
    {
      hyperliquid: { current: [] },
      lighter: { current: [] },
      pacifica: { current: [] },
      aster: { current: [] },
    },
  );
  const prevChartResetKeyRef = useRef<string | undefined>(undefined);

  useLayoutEffect(() => {
    if (
      prevChartResetKeyRef.current !== undefined &&
      prevChartResetKeyRef.current !== chartResetKey
    ) {
      prevCandlesRef.current = [];
      for (const venueId of ALL_VENUES) {
        prevCompareRefs.current[venueId].current = [];
      }
    }
    prevChartResetKeyRef.current = chartResetKey;
  }, [chartResetKey]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const prevCompare = prevCompareRefs.current;
    prevCandlesRef.current = [];
    for (const venueId of ALL_VENUES) {
      prevCompare[venueId].current = [];
    }

    const { bundle, dispose } = mountOhlcvChart(el, {
      chartMode,
      compareVenues,
      candleBars,
      compareSeries,
      onCompareLineHover,
    });

    bundleRef.current = bundle;

    if (chartMode === "candles") {
      prevCandlesRef.current = candleBars;
    } else {
      for (const venueId of ALL_VENUES) {
        prevCompare[venueId].current = compareSeries[venueId] ?? [];
      }
    }

    return () => {
      dispose();
      bundleRef.current = null;
      prevCandlesRef.current = [];
      for (const venueId of ALL_VENUES) {
        prevCompare[venueId].current = [];
      }
    };
    // Remount when chartResetKey changes (market / TF / venue / mode).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bar arrays synced in apply effect; not listing candle arrays here
  }, [chartMode, containerRef, onCompareLineHover, chartResetKey]);

  useEffect(() => {
    applyOhlcvChartData(
      bundleRef.current,
      chartMode,
      compareVenues,
      prevCandlesRef,
      prevCompareRefs.current,
      candleBars,
      compareSeries,
    );
  }, [chartMode, compareVenues, candleBars, compareSeries, chartResetKey]);
}
