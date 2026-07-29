import type { VenueId } from '@/src/adapters/base/types';
import { logPipelineError } from '@/src/lib/pipelineError';
import type { DepthLevel } from '../aggregation/cumulative';
import { fmtPriceWithDigits } from './depthChartLayout';
import { VENUE_DEPTH_HEX, VENUE_LABELS } from '../constants';
import type { DepthTooltipData } from '../types';
import { orderVenuesLighterInner } from './depthSegments';

// ─── Color maps (same hex as legend + depthSegments) ──────────────────────────



function fmtBase(n: number): string {
    return n.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
    });
}

function fmtUsdExact(n: number): string {
    if (!Number.isFinite(n) || n <= 0) return '—';
    return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildTooltipFromLevel(
    level: DepthLevel,
    side: 'bid' | 'ask',
    selectedVenues: VenueId[],
    maxCumulativeSize: number,
    maxCumulativeDollar: number,
    baseSymbol: string,
    priceFractionDigits: number,
): DepthTooltipData {
    try {
        const colorMap: Partial<Record<VenueId, string>> = {};
        for (const v of selectedVenues) {
            colorMap[v] = VENUE_DEPTH_HEX[v]?.[side] ?? '#888';
        }
        const px = level.bucketPrice;

        const venues: DepthTooltipData['venues'] = orderVenuesLighterInner(selectedVenues)
            .filter((v) => (level.byVenue[v] ?? 0) > 0)
            .map((v) => {
                const sz = level.byVenue[v] ?? 0;
                return {
                    name: VENUE_LABELS[v],
                    amountBase: fmtBase(sz),
                    amountUsd: fmtUsdExact(sz * px),
                    color: colorMap[v] ?? '#888',
                };
            });

        const pctDenom =
            maxCumulativeDollar > 0 ? maxCumulativeDollar : maxCumulativeSize > 0 ? maxCumulativeSize : 1;
        const pctNumer = maxCumulativeDollar > 0 ? level.cumulativeDollarDepth : level.cumulativeSize;
        const pctOfBook = ((pctNumer / pctDenom) * 100).toFixed(1);

        return {
            price: fmtPriceWithDigits(px, priceFractionDigits),
            baseSymbol,
            venues,
            levelSizeBase: fmtBase(level.totalSize),
            levelUsd: fmtUsdExact(level.dollarDepth),
            cumulativeBase: fmtBase(level.cumulativeSize),
            cumulativeUsd: fmtUsdExact(level.cumulativeDollarDepth),
            pctOfBook,
        };
    } catch (err) {
        logPipelineError(`buildTooltipFromLevel(${side})`, err);
        return {
            price: '—',
            baseSymbol,
            venues: [],
            levelSizeBase: '—',
            levelUsd: '—',
            cumulativeBase: '—',
            cumulativeUsd: '—',
            pctOfBook: '0',
        };
    }
}