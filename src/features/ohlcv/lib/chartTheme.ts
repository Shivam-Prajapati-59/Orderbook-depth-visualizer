import {
  ColorType,
  CrosshairMode,
  type ChartOptions,
  type DeepPartial,
  type IChartApi,
} from "lightweight-charts";

import { TRADING_SHELL } from "@/src/theme/trading";

export const INITIAL_VISIBLE_CANDLE_COUNT = 100;

export function applyInitialCandleViewport(
  chart: IChartApi,
  barCount: number,
): void {
  if (barCount <= 0) return;
  const visible = Math.min(INITIAL_VISIBLE_CANDLE_COUNT, barCount);
  const from = barCount - visible;
  chart.timeScale().setVisibleLogicalRange({ from, to: barCount - 1 });
}

const BG = TRADING_SHELL.bg;
const GRID = "rgba(42, 46, 57, 0.45)";
const TEXT = "#848E9C";
const BORDER = "rgba(42, 46, 57, 0.65)";
const CROSSHAIR = "rgba(117, 134, 150, 0.55)";
const LABEL_BG = "#2B3139";

export function createDarkChartOptions(): DeepPartial<ChartOptions> {
  return {
    layout: {
      background: { type: ColorType.Solid, color: BG },
      textColor: TEXT,
      fontSize: 11,
      fontFamily:
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    },
    grid: {
      vertLines: { color: GRID, style: 1 },
      horzLines: { color: GRID, style: 1 },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: {
        color: CROSSHAIR,
        width: 1,
        style: 3,
        labelBackgroundColor: LABEL_BG,
      },
      horzLine: {
        color: CROSSHAIR,
        width: 1,
        style: 3,
        labelBackgroundColor: LABEL_BG,
      },
    },
    rightPriceScale: {
      borderColor: BORDER,
    },
    timeScale: {
      borderColor: BORDER,
      timeVisible: true,
      secondsVisible: false,
    },
    localization: {
      locale: "en-US",
    },
  };
}
