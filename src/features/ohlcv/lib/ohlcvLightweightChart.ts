import type { RefObject } from "react";

import {
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createChart,
  type HistogramData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type LineData,
  type MouseEventParams,
  type SeriesType,
  type Time,
} from "lightweight-charts";

import {
  VENUE_CHART_COMPARE,
  type CompareVenueKey,
} from "@/src/theme/trading";
import type { OhlcvBar } from "../types";
import type { OhlcvChartMode } from "@/src/store/ohlcvSettingsStore";
import {
  applyInitialCandleViewport,
  createDarkChartOptions,
} from "./chartTheme";

export type CompareLineHoverPayload = {
  x: number;
  y: number;
  timeSec: number;
  /** Close price for every venue that has a data point at the crosshair. */
  prices: Partial<Record<CompareVenueKey, number>>;
  /** Spread between Hyperliquid and Lighter closes, when both are present. */
  spreadAbs: number | null;
  spreadPct: number | null;
};

type CompareVenueBundle = {
  line: ISeriesApi<"Line", Time>;
  vol: ISeriesApi<"Histogram", Time>;
};

const COMPARE_VOLUME_BAND_START = 0.34;
const COMPARE_VOLUME_BAND_STEP = 0.165;
const COMPARE_VOLUME_BAND_HEIGHT = 0.12;

export type OhlcvChartBundle = {
  chart: IChartApi;
  candleSeries?: ISeriesApi<"Candlestick", Time>;
  volSeries?: ISeriesApi<"Histogram", Time>;
  addHorizontalLine: (price: number) => void;
  clearHorizontalLines: () => void;
  /** Compare mode: one line + volume band per venue. */
  compareSeries?: Partial<Record<CompareVenueKey, CompareVenueBundle>>;
};

function barsToCandles(bars: OhlcvBar[]) {
  return bars.map((b) => ({
    time: b.time,
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
  }));
}

function barsToHistogram(bars: OhlcvBar[]): HistogramData[] {
  return bars.map((b) => ({
    time: b.time,
    value: b.volume,
    color:
      b.close >= b.open
        ? "rgba(14, 203, 129, 0.48)"
        : "rgba(246, 70, 93, 0.48)",
  }));
}

function barsToLine(bars: OhlcvBar[]): LineData[] {
  return bars.map((b) => ({ time: b.time, value: b.close }));
}

function barsToCompareVolumeHistogram(
  bars: OhlcvBar[],
  color: string,
): HistogramData[] {
  return bars.map((b) => ({
    time: b.time,
    value: b.volume,
    color,
  }));
}

function firstBarCloseImpliesDifferentInstrument(
  prev: OhlcvBar[],
  next: OhlcvBar[],
): boolean {
  if (prev.length === 0 || next.length === 0) return false;
  const a = prev[0]!.close;
  const b = next[0]!.close;
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0)
    return false;
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return hi / lo > 5;
}

function crosshairTimeSec(time: Time): number | null {
  return typeof time === "number" ? time : null;
}

function lineValueAtCrosshair(
  seriesData: MouseEventParams["seriesData"],
  series: ISeriesApi<SeriesType, Time>,
): number | null {
  const raw = seriesData.get(series as ISeriesApi<SeriesType, Time>);
  if (!raw || typeof raw !== "object" || !("value" in raw)) return null;
  const v = (raw as LineData).value;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function syncCandlesAndVolume(
  candleSeries: ISeriesApi<"Candlestick", Time>,
  volSeries: ISeriesApi<"Histogram", Time>,
  prevRef: RefObject<OhlcvBar[]>,
  next: OhlcvBar[],
): void {
  const prev = prevRef.current;
  if (prev === next) return;

  if (next.length === 0) {
    candleSeries.setData([]);
    volSeries.setData([]);
    prevRef.current = [];
    return;
  }

  if (prev.length === 0) {
    candleSeries.setData(barsToCandles(next));
    volSeries.setData(barsToHistogram(next));
    prevRef.current = next;
    return;
  }

  if (
    prev[0]?.time === next[0]?.time &&
    firstBarCloseImpliesDifferentInstrument(prev, next)
  ) {
    candleSeries.setData(barsToCandles(next));
    volSeries.setData(barsToHistogram(next));
    prevRef.current = next;
    return;
  }

  if (next.length < prev.length || prev[0]?.time !== next[0]?.time) {
    candleSeries.setData(barsToCandles(next));
    volSeries.setData(barsToHistogram(next));
    prevRef.current = next;
    return;
  }
  const lastNext = next[next.length - 1]!;
  const lastPrev = prev[prev.length - 1]!;

  if (next.length === prev.length && lastNext.time === lastPrev.time) {
    candleSeries.update(barsToCandles([lastNext])[0]!);
    volSeries.update(barsToHistogram([lastNext])[0]!);
    prevRef.current = next;
    return;
  }

  if (next.length === prev.length + 1 && lastPrev.time < lastNext.time) {
    candleSeries.update(barsToCandles([lastNext])[0]!);
    volSeries.update(barsToHistogram([lastNext])[0]!);
    prevRef.current = next;
    return;
  }

  candleSeries.setData(barsToCandles(next));
  volSeries.setData(barsToHistogram(next));
  prevRef.current = next;
}

/**
 * Keeps line + volume histogram in sync for one venue from the same `OhlcvBar[]`
 * (single prev ref — avoids double-sync bugs).
 */
function syncCompareVenue(
  lineSeries: ISeriesApi<"Line", Time>,
  volSeries: ISeriesApi<"Histogram", Time>,
  prevRef: RefObject<OhlcvBar[]>,
  next: OhlcvBar[],
  volColor: string,
): void {
  const prev = prevRef.current;
  if (prev === next) return;

  const points = barsToLine(next);
  const volPoints = barsToCompareVolumeHistogram(next, volColor);

  if (points.length === 0) {
    lineSeries.setData([]);
    volSeries.setData([]);
    prevRef.current = [];
    return;
  }

  if (prev.length === 0) {
    lineSeries.setData(points);
    volSeries.setData(volPoints);
    prevRef.current = next;
    return;
  }

  if (
    prev[0]?.time === next[0]?.time &&
    firstBarCloseImpliesDifferentInstrument(prev, next)
  ) {
    lineSeries.setData(points);
    volSeries.setData(volPoints);
    prevRef.current = next;
    return;
  }

  if (next.length < prev.length || prev[0]?.time !== next[0]?.time) {
    lineSeries.setData(points);
    volSeries.setData(volPoints);
    prevRef.current = next;
    return;
  }

  const lastNext = points[points.length - 1]!;
  const lastPrev = barsToLine(prev)[prev.length - 1]!;

  if (next.length === prev.length && lastNext.time === lastPrev.time) {
    lineSeries.update(lastNext);
    volSeries.update(volPoints[volPoints.length - 1]!);
    prevRef.current = next;
    return;
  }

  if (next.length === prev.length + 1 && lastPrev.time < lastNext.time) {
    lineSeries.update(lastNext);
    volSeries.update(volPoints[volPoints.length - 1]!);
    prevRef.current = next;
    return;
  }

  lineSeries.setData(points);
  volSeries.setData(volPoints);
  prevRef.current = next;
}

export type MountOhlcvChartInput = {
  chartMode: OhlcvChartMode;
  candleBars: OhlcvBar[];
  compareSeries: Partial<Record<CompareVenueKey, OhlcvBar[]>>;
  compareVenues: CompareVenueKey[];
  onCompareLineHover?: (payload: CompareLineHoverPayload | null) => void;
  onCandleClick?: (price: number) => void;
};

/**
 * Creates the chart DOM instance once per mode switch. Call `dispose()` on teardown.
 */
export function mountOhlcvChart(
  container: HTMLElement,
  input: MountOhlcvChartInput,
): { bundle: OhlcvChartBundle; dispose: () => void } {
  const {
    chartMode,
    candleBars,
    compareSeries,
    compareVenues,
    onCompareLineHover,
    onCandleClick,
  } = input;

  const chart = createChart(container, {
    ...createDarkChartOptions(),
    autoSize: true,
  });

  let compareSeriesMap: Partial<Record<CompareVenueKey, CompareVenueBundle>> =
    {};

  /** Only emit updates when we have at least one price; clear on container pointerleave (see mount). */
  const onCrosshairMove = (param: MouseEventParams<Time>) => {
    if (!onCompareLineHover) return;
    if (!param.point || param.time === undefined) {
      return;
    }
    const timeSec = crosshairTimeSec(param.time);
    if (timeSec === null) {
      return;
    }

    const prices: Partial<Record<CompareVenueKey, number>> = {};
    for (const venueId of compareVenues) {
      const line = compareSeriesMap[venueId]?.line;
      if (!line) continue;
      const price = lineValueAtCrosshair(param.seriesData, line);
      if (price !== null) {
        prices[venueId] = price;
      }
    }
    if (Object.keys(prices).length === 0) {
      return;
    }

    const hlPrice = prices.hyperliquid;
    const vtxPrice = prices.lighter;
    let spreadAbs: number | null = null;
    let spreadPct: number | null = null;
    if (hlPrice !== undefined && vtxPrice !== undefined) {
      const mid = (hlPrice + vtxPrice) / 2;
      spreadAbs = Math.abs(hlPrice - vtxPrice);
      spreadPct = mid !== 0 ? (spreadAbs / mid) * 100 : 0;
    }

    onCompareLineHover({
      x: param.point.x,
      y: param.point.y,
      timeSec,
      prices,
      spreadAbs,
      spreadPct,
    });
  };

  /** Draws one line + one volume band for every venue (empty bars render as empty series). */
  const mountCompareVenues = (): Partial<
    Record<CompareVenueKey, CompareVenueBundle>
  > => {
    const seriesMap: Partial<Record<CompareVenueKey, CompareVenueBundle>> = {};

    compareVenues.forEach((venueId, index) => {
      const palette = VENUE_CHART_COMPARE[venueId];
      const bars = compareSeries[venueId] ?? [];

      const line = chart.addSeries(LineSeries, {
        color: palette.line,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      const vol = chart.addSeries(HistogramSeries, {
        priceScaleId: `vol-${venueId}`,
        priceFormat: { type: "volume", precision: 1, minMove: 0.1 },
        color: palette.vol,
      });

      if (index === 0) {
        line.priceScale().applyOptions({
          scaleMargins: { top: 0.04, bottom: 0.3 },
        });
      }

      const bandTop =
        COMPARE_VOLUME_BAND_START + index * COMPARE_VOLUME_BAND_STEP;
      chart.priceScale(`vol-${venueId}`).applyOptions({
        // `bottom` is a margin from the bottom edge, not the band's bottom
        // coordinate. The two margins must sum to less than 1.
        scaleMargins: {
          top: bandTop,
          bottom: 1 - (bandTop + COMPARE_VOLUME_BAND_HEIGHT),
        },
      });

      line.setData(barsToLine(bars));
      vol.setData(barsToCompareVolumeHistogram(bars, palette.vol));

      seriesMap[venueId] = { line, vol };
    });

    return seriesMap;
  };

  const horizontalLines: IPriceLine[] = [];
  let candleSeries: ISeriesApi<"Candlestick", Time> | undefined;
  const addHorizontalLine = (price: number) => {
    if (!candleSeries || !Number.isFinite(price)) return;
    horizontalLines.push(candleSeries.createPriceLine({
      price,
      color: "#F0B90B",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "",
    }));
  };
  const clearHorizontalLines = () => {
    if (!candleSeries) return;
    horizontalLines.splice(0).forEach((line) => candleSeries?.removePriceLine(line));
  };
  let bundle: OhlcvChartBundle;

  if (chartMode === "candles") {
    onCompareLineHover?.(null);
    candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#0ECB81",
      downColor: "#F6465D",
      borderVisible: false,
      wickUpColor: "#0ECB81",
      wickDownColor: "#F6465D",
    });
    candleSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.05, bottom: 0.28 },
    });

    const volSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: "volume",
      priceFormat: { type: "volume", precision: 1, minMove: 0.1 },
      color: "rgba(14, 203, 129, 0.35)",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.74, bottom: 0 },
    });

    candleSeries.setData(barsToCandles(candleBars));
    volSeries.setData(barsToHistogram(candleBars));
    bundle = { chart, candleSeries, volSeries, addHorizontalLine, clearHorizontalLines };
  } else {
    compareSeriesMap = mountCompareVenues();
    bundle = { chart, compareSeries: compareSeriesMap, addHorizontalLine, clearHorizontalLines };

    if (onCompareLineHover) {
      chart.subscribeCrosshairMove(onCrosshairMove);
    }
  }

  {
    const barCount =
      chartMode === "candles"
        ? candleBars.length
        : Math.max(
            ...compareVenues.map(
              (venueId) => compareSeries[venueId]?.length ?? 0,
            ),
          );
    applyInitialCandleViewport(chart, barCount);
  }

  let removePointerLeave: (() => void) | null = null;
  if (chartMode === "compare" && onCompareLineHover) {
    const onPointerLeave = () => onCompareLineHover(null);
    container.addEventListener("pointerleave", onPointerLeave);
    removePointerLeave = () => {
      container.removeEventListener("pointerleave", onPointerLeave);
    };
  }

  const onChartClick = (param: MouseEventParams<Time>) => {
    if (chartMode !== "candles" || !candleSeries || !param.point || !onCandleClick) return;
    const price = candleSeries.coordinateToPrice(param.point.y);
    if (price !== null) onCandleClick(price);
  };
  if (chartMode === "candles" && onCandleClick) chart.subscribeClick(onChartClick);

  const dispose = () => {
    onCompareLineHover?.(null);
    removePointerLeave?.();
    removePointerLeave = null;
    if (chartMode !== "candles" && onCompareLineHover) {
      chart.unsubscribeCrosshairMove(onCrosshairMove);
    }
    if (chartMode === "candles" && onCandleClick) chart.unsubscribeClick(onChartClick);
    chart.remove();
  };

  return { bundle, dispose };
}

/** Applies bar updates without recreating the chart (keeps pan/zoom stable during streaming). */
export function applyOhlcvChartData(
  bundle: OhlcvChartBundle | null,
  chartMode: OhlcvChartMode,
  compareVenues: CompareVenueKey[],
  prevCandlesRef: RefObject<OhlcvBar[]>,
  prevCompareRefs: Record<CompareVenueKey, RefObject<OhlcvBar[]>>,
  candleBars: OhlcvBar[],
  compareSeries: Partial<Record<CompareVenueKey, OhlcvBar[]>>,
): void {
  if (!bundle) return;

  if (chartMode === "candles" && bundle.candleSeries && bundle.volSeries) {
    syncCandlesAndVolume(
      bundle.candleSeries,
      bundle.volSeries,
      prevCandlesRef,
      candleBars,
    );
    return;
  }

  if (chartMode === "compare" && bundle.compareSeries) {
    for (const venueId of compareVenues) {
      const venue = bundle.compareSeries[venueId];
      const prevRef = prevCompareRefs[venueId];
      const next = compareSeries[venueId];
      if (!venue || !prevRef) continue;
      syncCompareVenue(
        venue.line,
        venue.vol,
        prevRef,
        next ?? [],
        VENUE_CHART_COMPARE[venueId].vol,
      );
    }
  }
}
