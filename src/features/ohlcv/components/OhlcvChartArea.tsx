'use client';

import { forwardRef } from 'react';

import { VENUE_LABELS } from '@/src/features/orderbook/constants';
import { COMPARE_VENUE_ORDER, VENUE_CHART_COMPARE } from '@/src/theme/trading';

import { CompareLineTooltipCard } from './CompareLineTooltip';
import type { OhlcvChartAreaProps } from '../componentProps';
import { useOhlcvSettingsStore } from '@/src/store/ohlcvSettingsStore';

export type { OhlcvChartAreaProps } from '../componentProps';

export const OhlcvChartArea = forwardRef<HTMLDivElement, OhlcvChartAreaProps>(
    function OhlcvChartArea({ compareTooltip }, ref) {
        const chartMode = useOhlcvSettingsStore((s) => s.chartMode);
        const compareVenues = useOhlcvSettingsStore((s) => s.compareVenues);

        return (
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col px-1.5 pb-2 sm:px-2">
                <div className="relative min-h-0 w-full flex-1">
                    <div ref={ref} className="absolute inset-0 min-h-0 w-full" />
                    {chartMode === 'compare' ? (
                        <div
                            className="pointer-events-none absolute left-1.5 top-1.5 z-10 flex max-w-44 flex-col gap-1 rounded-md border border-white/10 bg-trading-bg/94 px-2 py-1.5 font-mono text-[length:var(--text-trading-xs)] leading-snug text-gray-300 shadow-md backdrop-blur-sm sm:left-2 sm:top-2 sm:gap-1.5 sm:px-2.5 sm:py-2 sm:text-[length:var(--text-trading-sm)]"
                            aria-label="Compare mode: venue price lines and per-venue volume histograms"
                        >
                            {COMPARE_VENUE_ORDER.filter((venueId) => compareVenues.includes(venueId)).map((venueId) => (
                                <span key={venueId} className="flex items-center gap-1.5">
                                    <span
                                        className="size-2 shrink-0 rounded-full ring-1 ring-black/40"
                                        style={{ backgroundColor: VENUE_CHART_COMPARE[venueId].line }}
                                    />
                                    <span className="truncate">{VENUE_LABELS[venueId]}</span>
                                </span>
                            ))}
                            <span className="border-t border-white/8 pt-1 font-mono text-[8px] leading-tight text-gray-500">
                                Volume: one band below each venue.
                            </span>
                        </div>
                    ) : null}
                    {compareTooltip ? (
                        <div
                            className="pointer-events-none absolute z-20 motion-reduce:transition-none"
                            style={{
                                left: compareTooltip.position.x,
                                top: compareTooltip.position.y,
                                transform: 'translate(12px, calc(-100% - 10px))',
                                transition: 'left 45ms linear, top 45ms linear',
                            }}
                        >
                            <CompareLineTooltipCard data={compareTooltip.data} />
                        </div>
                    ) : null}
                </div>
            </div>
        );
    },
);
