import { NormalizedOrderBook, OrderBookLevel, VenueId } from '@/src/adapters/base/types';
import { logPipelineError } from '@/src/lib/pipelineError';
import { BucketLevels, resolveUnifiedTickSize } from './bucketing';
import {
    computeCumulativeDepth,
    findMaxCumulativeDollar,
    findMaxCumulativeSize,
    DepthLevel,
} from './cumulative';

// Options to control the minimum display-grid granularity
export type AggregateDepthOptions = {
    displayTickFloor?: number; // Hard floor for display tick size (prevents too-fine buckets)
};

// Resolve the display tick size: pick the coarsest tick among all venues, then clamp to floor if given
function resolveDisplayTickSize(venueTickValues: number[], floor?: number): number {
    const meta = resolveUnifiedTickSize(venueTickValues);
    if (floor != null && Number.isFinite(floor) && floor > 0) {
        return Math.max(meta, floor);
    }
    return meta;
}

// Scan all levels to find the true best bid/ask (raw, not bucketed)
function computeRawTopofBook(
    bids: OrderBookLevel[],
    asks: OrderBookLevel[],
): { rawBestAsk: number | null; rawBestBid: number | null } {
    let rawBestBid: number | null = null;
    let rawBestAsk: number | null = null;

    // Highest price among valid bids
    for (const b of bids) {
        if (Number.isFinite(b.price) && b.price > 0 && Number.isFinite(b.size) && b.size > 0) {
            rawBestBid = rawBestBid == null ? b.price : Math.max(rawBestBid, b.price);
        }
    }
    // Lowest price among valid asks
    for (const a of asks) {
        if (Number.isFinite(a.price) && a.price > 0 && Number.isFinite(a.size) && a.size > 0) {
            rawBestAsk = rawBestAsk == null ? a.price : Math.min(rawBestAsk, a.price);
        }
    }

    return { rawBestBid, rawBestAsk };
}
// Result of aggregating one or more venue order-books into a unified depth view
export interface AggregatedDepth {
    bids: DepthLevel[];
    asks: DepthLevel[];
    rawBestBid: number | null;         // True best bid (from raw levels, not bucketed)
    rawBestAsk: number | null;         // True best ask (from raw levels, not bucketed)
    displayBestBid: number | null;     // Best bid snapped to the display grid
    displayBestAsk: number | null;     // Best ask snapped to the display grid
    spread: number | null;             // Raw spread (ask - bid)
    midPrice: number | null;           // Midpoint of raw best bid/ask
    spreadPercentage: number | null;   // Spread as a percentage of mid-price
    displayTickSize: number;           // Tick size used for bucketing the visible grid
    maxCumulativeSize: number;         // Peak cumulative size (for bar-width scaling)
    maxCumulativeDollar: number;       // Peak cumulative notional (for bar-width scaling)
}

// Merge order-books from multiple venues into a single aggregated depth view.
// Buckets raw levels into a uniform tick grid, computes cumulative depth, and derives headline metrics.
export const aggregateDepth = (
    books: Partial<Record<VenueId, NormalizedOrderBook>>,
    asset: string,
    visibleLevels: number,
    venueTicks: Partial<Record<VenueId, number>>,
    options?: AggregateDepthOptions,
): AggregatedDepth => {
    const floor = options?.displayTickFloor;

    try {
        // Only consider venues that have actual book data
        const venueIds = (Object.keys(books) as VenueId[]).filter(
            (v): v is VenueId => books[v] != null,
        );

        // Short-circuit when no venues have book data
        if (venueIds.length === 0) {
            return {
                bids: [],
                asks: [],
                rawBestBid: null,
                rawBestAsk: null,
                displayBestBid: null,
                displayBestAsk: null,
                midPrice: null,
                spread: null,
                spreadPercentage: null,
                displayTickSize: resolveDisplayTickSize([], floor),
                maxCumulativeSize: 0,
                maxCumulativeDollar: 0,
            };
        }

        // Resolve the unified tick size from all active venues' tick values
        const perVenueTicks = venueIds.map((v) => venueTicks[v]);
        const displayTickSize = resolveDisplayTickSize(
            perVenueTicks.filter((t): t is number => t != null),
            floor,
        );

        // Concatenate all levels across venues
        const allBids = venueIds.flatMap((v) => books[v]!.bids);
        const allAsks = venueIds.flatMap((v) => books[v]!.asks);

        // Return empty only when neither side has any levels
        if (allBids.length === 0 && allAsks.length === 0) {
            return {
                bids: [],
                asks: [],
                rawBestBid: null,
                rawBestAsk: null,
                displayBestBid: null,
                displayBestAsk: null,
                midPrice: null,
                spread: null,
                spreadPercentage: null,
                displayTickSize,
                maxCumulativeSize: 0,
                maxCumulativeDollar: 0,
            };
        }

        const { rawBestBid, rawBestAsk } = computeRawTopofBook(allBids, allAsks);

        // Bucket raw levels into the unified tick grid (available sides independently)
        const bucketedBids = BucketLevels(allBids, displayTickSize, 'bid');
        const bucketedAsks = BucketLevels(allAsks, displayTickSize, 'ask');

        // Compute cumulative depth only over the visible slice so bar-width scales consistently
        const safeVisibleLevels = Math.max(0, visibleLevels);
        const slicedBids = bucketedBids.slice(0, safeVisibleLevels);
        const slicedAsks = bucketedAsks.slice(0, safeVisibleLevels);
        const bids = computeCumulativeDepth(slicedBids);
        const asks = computeCumulativeDepth(slicedAsks);

        // Display best comes from the bucketed grid; headline spread/mid uses raw top-of-book.
        // When a side's raw top-of-book is missing, null only cross-side metrics for that side.
        const displayBestBid = rawBestBid != null && rawBestBid > 0 ? (bids[0]?.bucketPrice ?? null) : null;
        const displayBestAsk = rawBestAsk != null && rawBestAsk > 0 ? (asks[0]?.bucketPrice ?? null) : null;
        let spread: number | null = null;
        let spreadPercentage: number | null = null;
        let midPrice: number | null = null;

        if (rawBestBid !== null && rawBestAsk !== null && rawBestBid > 0 && rawBestAsk > 0) {
            spread = Math.max(0, rawBestAsk - rawBestBid);
            midPrice = (rawBestBid + rawBestAsk) / 2;
            spreadPercentage = midPrice > 0 && spread != null ? (spread / midPrice) * 100 : null;
        }

        const maxCumulativeSize = findMaxCumulativeSize(bids, asks);
        const maxCumulativeDollar = findMaxCumulativeDollar(bids, asks);

        return {
            bids,
            asks,
            rawBestBid,
            rawBestAsk,
            displayBestBid,
            displayBestAsk,
            midPrice,
            spread,
            spreadPercentage,
            displayTickSize,
            maxCumulativeSize,
            maxCumulativeDollar,
        };
    } catch (err) {
        logPipelineError(`aggregateDepth(${asset})`, err);
        return {
            bids: [],
            asks: [],
            rawBestBid: null,
            rawBestAsk: null,
            displayBestBid: null,
            displayBestAsk: null,
            midPrice: null,
            spread: null,
            spreadPercentage: null,
            displayTickSize: resolveDisplayTickSize(
                (Object.keys(books) as VenueId[])
                    .map((v) => venueTicks[v])
                    .filter((t): t is number => t != null),
                floor,
            ),
            maxCumulativeSize: 0,
            maxCumulativeDollar: 0,
        };
    }
};


