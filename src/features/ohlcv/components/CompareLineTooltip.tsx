import { VENUE_LABELS } from '@/src/features/orderbook/constants';
import { COMPARE_VENUE_ORDER, VENUE_CHART_COMPARE } from '@/src/theme/trading';

import { cn } from '@/src/lib/utils';

import type { CompareLineHoverPayload } from '../hooks/useOhlcvChart';
import type { OhlcvTimeframe } from '../types';
import type {
    CompareLineTooltipCardProps,
    CompareLineTooltipData,
    CompareLineTooltipVenue,
} from '../componentProps';

export type {
    CompareLineTooltipCardProps,
    CompareLineTooltipData,
} from '../componentProps';

function fmtPrice(n: number) {
    const abs = Math.abs(n);
    const digits = abs >= 100 ? 2 : abs >= 1 ? 3 : abs >= 0.01 ? 5 : 8;
    return n.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: digits,
    });
}

export function buildCompareLineTooltipData(
    payload: CompareLineHoverPayload,
    timeframe: OhlcvTimeframe,
): CompareLineTooltipData {
    const d = new Date(payload.timeSec * 1000);
    const timeLabel = d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...(timeframe === '1m' || timeframe === '5m' ? { second: '2-digit' } : {}),
    });

    const venues: CompareLineTooltipVenue[] = [];
    for (const venueId of COMPARE_VENUE_ORDER) {
        const price = payload.prices[venueId];
        if (price === undefined) continue;
        venues.push({
            name: VENUE_LABELS[venueId],
            price,
            color: VENUE_CHART_COMPARE[venueId].line,
        });
    }

    return {
        timeLabel,
        venues,
        spreadAbs: payload.spreadAbs,
        spreadPct: payload.spreadPct,
    };
}

export function CompareLineTooltipCard({ data, className }: CompareLineTooltipCardProps) {
    return (
        <div
            className={cn(
                'pointer-events-none min-w-[200px] bg-card rounded-lg border border-trading-border bg-trading-border p-3 text-trading-text shadow-lg',
                className,
            )}
        >
            <div className="mb-3 flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Time</span>
                <span className="font-mono text-[11px] font-semibold text-gray-200">{data.timeLabel}</span>
            </div>
            <div className="mb-3 space-y-2">
                {data.venues.map((venue) => (
                    <div key={venue.name} className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                            <div className="size-3 rounded-sm" style={{ backgroundColor: venue.color }} />
                            <span className="font-medium text-gray-400">{venue.name}</span>
                        </div>
                        <span className="font-mono font-bold text-white">{fmtPrice(venue.price)}</span>
                    </div>
                ))}
            </div>
            {data.spreadAbs !== null && data.spreadPct !== null ? (
                <div className="space-y-1.5 border-t border-gray-800 pt-2">
                    <div className="flex justify-between text-[10px]">
                        <span className="font-bold text-gray-500 uppercase">Spread (HL vs Lighter)</span>
                        <span className="font-mono font-bold text-trading-accent">{fmtPrice(data.spreadAbs)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">Spread %</span>
                        <span className="font-mono font-medium text-gray-300">{data.spreadPct.toFixed(3)}%</span>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
