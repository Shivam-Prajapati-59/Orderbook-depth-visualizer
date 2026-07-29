import { OrderBookLevel } from "@/src/adapters/base/types";
import { normalizePriceForSide } from "../lib/normalizePrice";
import { logPipelineError } from "@/src/lib/pipelineError";

// A single price-bucket after aggregating orders from one or more venues
export interface BucketedLevel {
    bucketPrice: number;          // Snapped price at the bucket's grid line
    totalSize: number;            // Sum of all order sizes falling into this bucket
    byVenue: Partial<Record<string, number>>;  // Per-venue size breakdown (for multi-venue overlay)
}

// Group raw order-book levels into uniform tick-sized buckets.
// Bids are rounded down (floor), asks rounded up (ceil) so each level stays on its side of the spread.
export const BucketLevels = (
    levels: OrderBookLevel[],
    bucketSize: number,
    side: 'bid' | 'ask',
) => {

    try {
        // Bucket map keyed by 8-decimal-rounded price to avoid floating-point key mismatches
        const bucketMap = new Map<number, BucketedLevel>();

        for (const level of levels) {
            if (!Number.isFinite(level.price) || level.price <= 0 || !Number.isFinite(level.size) || level.size <= 0) {
                continue;
            }
            // Snap the raw price to the nearest grid line (biased per side)
            const bucketPrice = normalizePriceForSide(level.price, bucketSize, side);

            // Key by tick-grid index — exact regardless of price magnitude/precision
            const key = Math.round(bucketPrice / bucketSize);

            if (!bucketMap.has(key)) {
                bucketMap.set(key, {
                    bucketPrice,
                    totalSize: 0,
                    byVenue: {},
                });
            }

            const bucket = bucketMap.get(key)!;
            bucket.totalSize += level.size;
            // Accumulate venue-specific size for multi-venue visualisation
            bucket.byVenue[level.venue] = (bucket.byVenue[level.venue] ?? 0) + level.size;
        }
        const result = Array.from(bucketMap.values());

        // Sort: asks ascending (lowest first), bids descending (highest first)
        result.sort((a, b) => side === 'ask'
            ? a.bucketPrice - b.bucketPrice
            : b.bucketPrice - a.bucketPrice);

        return result;

    } catch (error) {
        logPipelineError(`bucketLevels(${side})`, error);
        return [];
    }
}
// Pick the largest tick size among the given venues (coarsest wins) with a 0.01 fallback
export function resolveUnifiedTickSize(ticks: number[]): number {
    const DEFAULT_FALLBACK = 0.01;
    try {
        const valid = ticks.filter((t) => Number.isFinite(t) && t > 0);
        if (valid.length === 0) return DEFAULT_FALLBACK;
        return Math.max(...valid);
    } catch (err) {
        logPipelineError('resolveUnifiedTickSize', err);
        return DEFAULT_FALLBACK;
    }
}