export const TRADING_SHELL = {
  bg: "#0B0E11",
  border: "#1E2329",
  accent: "#F0B90B",
  text: "#EAECEF",
  panelMuted: "#0d1117",
  depthGridDot: "#1e2329",
} as const;

export type VenuePaletteKey = "hyperliquid" | "lighter";

export const VENUE_PALETTE: Record<
  VenuePaletteKey,
  { bid: string; ask: string }
> = {
  hyperliquid: { bid: "#2FBF71", ask: "#D9363E" },
  lighter: { bid: "#A7E3C5", ask: "#F2B6B8" },
} as const;

export type CompareVenueKey =
  | "hyperliquid"
  | "lighter"
  | "pacifica"
  | "aster";

/** Canonical venue order for the OHLCV compare chart (lines, volume bands, legend, tooltip). */
export const COMPARE_VENUE_ORDER: CompareVenueKey[] = [
  "hyperliquid",
  "lighter",
  "pacifica",
  "aster",
];

export const VENUE_CHART_COMPARE: Record<
  CompareVenueKey,
  { line: string; vol: string }
> = {
  hyperliquid: {
    line: "#DAA526",
    vol: "rgba(218, 165, 32, 0.48)",
  },
  lighter: {
    line: "#8B5CF6",
    vol: "rgba(139, 92, 246, 0.55)",
  },
  pacifica: {
    line: "#818CF8",
    vol: "rgba(129, 140, 248, 0.45)",
  },
  aster: {
    line: "#22D3EE",
    vol: "rgba(34, 211, 238, 0.45)",
  },
} as const;

export const TRADING_TYPE = {
  xs: 10,
  sm: 11,
  md: 12,
} as const;
