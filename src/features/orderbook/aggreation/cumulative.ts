import { logPipelineError } from '@/src/lib/pipelineError';
import { BucketedLevel } from './bucketing';

// A bucketed level enriched with running-total and dollar-value fields
export interface DepthLevel extends BucketedLevel {
    cumulativeSize: number;          // Running total size from top-of-book downward
    cumulativeDollarDepth: number;   // Running total notional ($) from top-of-book downward
    dollarDepth: number;             // Notional value of this single bucket (size × price)
}

// Walk the sorted bucket array and attach cumulative totals (size & dollar).
// The last element holds the full visible depth.
export const computeCumulativeDepth = (levels: BucketedLevel[]): DepthLevel[] => {

    try {
        let cumulativeSize = 0;
        let cumulativeDollarDepth = 0;

        const result = levels.map((level) => {
            const dollarDepth = level.totalSize * level.bucketPrice;
            cumulativeSize += level.totalSize;
            cumulativeDollarDepth += dollarDepth;
            return {
                ...level,
                cumulativeDollarDepth: cumulativeDollarDepth,
                cumulativeSize: cumulativeSize,
                dollarDepth: dollarDepth,
            };
        });
        return result;

    } catch (error) {
        logPipelineError("Could not cumulate depths", error);
        return [];
    }
};

// Peak cumulative size across both sides (used as the 100 % bar-width reference)
export const findMaxCumulativeSize = (bids: DepthLevel[], asks: DepthLevel[]): number => {
    try {
        const bidMax = bids.at(-1)?.cumulativeSize ?? 0;
        const askMax = asks.at(-1)?.cumulativeSize ?? 0;

        return Math.max(bidMax, askMax, 1); // floor at 1 to avoid zero-division in width calc
    } catch (error) {
        logPipelineError("Could not find max cumulative size", error);
        return 1;
    }
};

// Peak cumulative notional across both sides (used as the 100 % bar-width reference)
export const findMaxCumulativeDollar = (bids: DepthLevel[], asks: DepthLevel[]): number => {
    try {
        const bidMax = bids.at(-1)?.cumulativeDollarDepth ?? 0;
        const askMax = asks.at(-1)?.cumulativeDollarDepth ?? 0;

        return Math.max(bidMax, askMax, 1); // floor at 1 to avoid zero-division in width calc
    } catch (error) {
        logPipelineError("Could not find max cumulative dollar", error);
        return 1;
    }
};