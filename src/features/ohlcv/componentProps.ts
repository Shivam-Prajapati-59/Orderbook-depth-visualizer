import type { CompareLineHoverPayload } from "./hooks/useOhlcvChart";

export type CompareLineTooltipVenue = {
  name: string;
  price: number;
  color: string;
};

export type CompareLineTooltipData = {
  timeLabel: string;
  venues: CompareLineTooltipVenue[];
  /** Null when either reference venue (Hyperliquid/Lighter) has no point at the crosshair. */
  spreadAbs: number | null;
  spreadPct: number | null;
};

export type CompareLineTooltipCardProps = {
  data: CompareLineTooltipData;
  className?: string;
};

export type OhlcvChartAreaProps = {
  compareTooltip: {
    position: Pick<CompareLineHoverPayload, "x" | "y">;
    data: CompareLineTooltipData;
  } | null;
};
