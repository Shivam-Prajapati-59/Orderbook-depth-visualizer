import { logPipelineError } from '@/src/lib/pipelineError';
import type { DepthLevel } from '../aggregation/cumulative';
import { VENUE, VENUE_DEPTH_HEX, type VenueId } from '../constants';

export interface DepthSegment {
    key: string,
    widthPct: number,
    backgroundColor: string,
}

export function orderVenuesLighterInner(venues: VenueId[]): VenueId[] {
    const lighter = venues.filter((v) => v === VENUE.LIGHTER);
    const others = venues.filter((v) => v !== VENUE.LIGHTER);
    return [...lighter, ...others];
}

//  Bar total width = cumulativeSize / maxCumulativeSize.

function venueSegments(
    level: DepthLevel,
    venues: VenueId[],
    maxCumulativeSize: number,
    side: 'bid' | 'ask',
): DepthSegment[] {
    try {
        if (maxCumulativeSize <= 0 || level.totalSize <= 0) return [];

        const barPct = Math.min(100, (level.cumulativeSize / maxCumulativeSize) * 100);
        const out: DepthSegment[] = [];

        for (const venue of orderVenuesLighterInner(venues)) {
            const venueSize = level.byVenue[venue] ?? 0;
            if (venueSize <= 0) continue;

            out.push({
                key: venue,
                widthPct: barPct * (venueSize / level.totalSize),
                backgroundColor: VENUE_DEPTH_HEX[venue]?.[side] ?? VENUE_DEPTH_HEX[VENUE.HYPERLIQUID][side],
            });
        }

        return out;
    } catch (err) {
        logPipelineError(`${side}Segments`, err);
        return [];
    }
}

export const bidSegments = (level: DepthLevel, venues: VenueId[], maxCumulativeSize: number) =>
    venueSegments(level, venues, maxCumulativeSize, 'bid');
export const askSegments = (level: DepthLevel, venues: VenueId[], maxCumulativeSize: number) =>
    venueSegments(level, venues, maxCumulativeSize, 'ask');