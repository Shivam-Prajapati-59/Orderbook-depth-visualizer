// Data payload for the depth-tooltip shown on hover over a price level
export type DepthTooltipData = {
    price: string;            // Formatted bucket price
    baseSymbol: string;       // Asset symbol (e.g. "BTC")
    venues: {                 // Per-venue breakdown at this level
        name: string;
        amountBase: string;   // Size in base asset (formatted)
        amountUsd: string;    // Notional value in USD (formatted)
        color: string;        // Hex colour for the venue bar
    }[];
    levelSizeBase: string;    // Total size across all venues at this level
    levelUsd: string;         // Total notional at this level
    cumulativeBase: string;   // Running total size from top-of-book
    cumulativeUsd: string;    // Running total notional from top-of-book
    pctOfBook: string;        // This level's share of total visible depth (percentage string)
};