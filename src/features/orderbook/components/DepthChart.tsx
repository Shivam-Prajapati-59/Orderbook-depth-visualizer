'use client';

import { Fragment, useEffect, useMemo, useRef } from 'react';

import type { VenueId } from '@/src/adapters/base/types';
import {
    dismissFeedToast,
    feedToastId,
    toastFeedError,
    toastFeedWarning,
} from '@/src/lib/feedToast';
import { useMarketStore } from '@/src/store/marketStore';
import { aggregatedDepthDisplayTick, depthAxisFractionDigits } from '@/src/config/trademarket';

import { aggregateDepth, type AggregatedDepth } from '../aggregation/aggregator';
import { VENUE_LABELS } from '../constants';
import { useOrderBookStream } from '../hooks/useOrderBookStream';
import {
    getDepthPaneStatus,
    selectedVenuesAllErrored,
    selectedVenuesAnyLoading,
    venuesInError,
} from '../lib/depthFeedUI';
import { useDepthSettingsStore } from '../store/depthSettingStore';
import { useOrderbookStore } from '../store/orderbookStore';
import type { SplitVenuePlaceholderProps } from '../componentProps';
import { fmtPriceWithDigits, priceFractionDigitsForTick } from '../lib/depthChartLayout';
import { DepthGrid } from './DepthGrid';
import { DepthChartSkeleton, DepthChartSkeletonColumn } from './DepthChartSkeleton';
import { useShallow } from 'zustand/shallow';

function formatMidPriceLabel(mid: number | null | undefined, fractionDigits: number): string {
    if (mid == null || !Number.isFinite(mid)) return '—';
    return fmtPriceWithDigits(mid, fractionDigits);
}

function SplitVenuePlaceholder({ label }: SplitVenuePlaceholderProps) {
    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center px-2 text-center">
            <p className="text-[11px] text-gray-600">Waiting for {label}…</p>
        </div>
    );
}

function PaneUnavailable({ label, detail }: { label: string; detail?: string }) {
    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center px-2 text-center">
            <p className="text-[11px] text-gray-500">{label} unavailable</p>
            {detail ? (
                <p className="mt-1 max-w-[14rem] font-mono text-[9px] leading-snug text-gray-600">
                    {detail}
                </p>
            ) : null}
        </div>
    );
}

export function DepthChart() {
    const displayMode = useDepthSettingsStore((s) => s.displayMode);
    const selectedVenues = useDepthSettingsStore((s) => s.selectedVenues);
    const depthLevels = useDepthSettingsStore((s) => s.depthLevels);

    const asset = useMarketStore((s) => s.selectedMarketId);

    useOrderBookStream({ asset, venues: selectedVenues });

    // Selector returns a new object each run; without `useShallow`, Zustand would treat the
    // selection as changed every time and re-render this component on every store update.
    const { books, connections, venueTicks } = useOrderbookStore(
        useShallow((s) => ({
            books: s.books,
            connections: s.connections,
            venueTicks: s.venueOrderbookTicks,
        })),
    );

    // Track currently active disconnect toast IDs across effect runs so we only
    // dismiss when a venue recovers or is removed, never on a stale cleanup.
    const activeToastIdsRef = useRef<Map<VenueId, string>>(new Map());

    useEffect(() => {
        const active = activeToastIdsRef.current;
        const currentVenues = new Set(selectedVenues);

        // Dismiss toasts for venues no longer selected or now healthy
        for (const [venue, id] of active) {
            if (!currentVenues.has(venue)) {
                dismissFeedToast(id);
                active.delete(venue);
            } else {
                const c = connections[venue];
                if (c?.status !== 'error') {
                    dismissFeedToast(id);
                    active.delete(venue);
                }
            }
        }

        // Show toasts for newly errored venues
        for (const v of selectedVenues) {
            const c = connections[v];
            if (c?.status === 'error') {
                const id = feedToastId.orderbook(v);
                if (!active.has(v)) {
                    toastFeedError(id, `${VENUE_LABELS[v]} order book disconnected`, c.errorMessage);
                    active.set(v, id);
                }
            }
        }

        // Cleanup on unmount: dismiss any remaining active toasts
        return () => {
            for (const id of active.values()) dismissFeedToast(id);
            active.clear();
        };
    }, [connections, selectedVenues]);

    const useSplitLayout = displayMode === 'split';

    const aggregatedTickFloor = aggregatedDepthDisplayTick(asset);

    const aggregated = useMemo(
        () =>
            aggregatedTickFloor != null
                ? aggregateDepth(books, asset, depthLevels, venueTicks, {
                    displayTickFloor: aggregatedTickFloor,
                })
                : aggregateDepth(books, asset, depthLevels, venueTicks),
        [books, asset, depthLevels, venueTicks, aggregatedTickFloor],
    );

    const aggPriceDigits = depthAxisFractionDigits(
        asset,
        priceFractionDigitsForTick(aggregated.displayTickSize),
    );

    // Per-venue depth for split layout (computed only when in split mode)
    const perVenueDepths = useMemo(() => {
        if (!useSplitLayout) return {} as Partial<Record<VenueId, AggregatedDepth>>;
        const result: Partial<Record<VenueId, AggregatedDepth>> = {};
        for (const v of selectedVenues) {
            if (books[v]) {
                result[v] = aggregateDepth(
                    { [v]: books[v] } as typeof books,
                    asset,
                    depthLevels,
                    venueTicks,
                );
            }
        }
        return result;
    }, [books, asset, depthLevels, useSplitLayout, venueTicks, selectedVenues]);

    const midPrice = aggregated.midPrice ?? 0;
    const spreadAbs = aggregated.spread ?? 0;
    const midPriceLabel = formatMidPriceLabel(aggregated.midPrice, aggPriceDigits);

    const failedVenues = useMemo(
        () => venuesInError(selectedVenues, connections),
        [selectedVenues, connections],
    );

    const warnPartialFailure = useMemo(() => {
        if (failedVenues.length === 0) return false;
        const hasLevels = aggregated.bids.length > 0 || aggregated.asks.length > 0;
        return hasLevels && failedVenues.length < selectedVenues.length;
    }, [failedVenues.length, aggregated.bids.length, aggregated.asks.length, selectedVenues.length]);

    const failedVenuesKey = failedVenues.join(',');

    useEffect(() => {
        const id = 'feed:orderbook:partial';
        if (warnPartialFailure) {
            const names = failedVenuesKey
                .split(',')
                .filter(Boolean)
                .map((v: string) => VENUE_LABELS[v as VenueId])
                .join(', ');
            toastFeedWarning(
                id,
                'Partial order book',
                `No live data from ${names}. Showing other venues only.`,
            );
        } else {
            dismissFeedToast(id);
        }
    }, [warnPartialFailure, failedVenuesKey]);

    const aggregatedEmpty = aggregated.bids.length === 0 && aggregated.asks.length === 0;

    const allErrored = selectedVenuesAllErrored(selectedVenues, connections);
    const anyLoading = selectedVenuesAnyLoading(selectedVenues, books, connections);

    if (aggregatedEmpty) {
        if (selectedVenues.length > 0 && allErrored) {
            return (
                <div className="flex flex-1 items-center justify-center px-2 text-center">
                    <p className="font-mono text-[11px] text-gray-500">
                        Order book unavailable — see toast for details.
                    </p>
                </div>
            );
        }

        if (selectedVenues.length > 0 && anyLoading) {
            return (
                <DepthChartSkeleton
                    variant={useSplitLayout ? 'split' : 'full'}
                    className="min-h-0 flex-1"
                />
            );
        }

        return (
            <div className="flex flex-1 items-center justify-center px-2 text-center">
                <p className="font-mono text-[11px] text-gray-600">
                    No market depth for this asset yet. Select venues above.
                </p>
            </div>
        );
    }

    // ── Split layout: one panel per selected venue ──────────────────────
    if (useSplitLayout) {
        return (
            <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
                {selectedVenues.map((venue, idx) => {
                    const venueDepth = perVenueDepths[venue];
                    const status = getDepthPaneStatus(books[venue], connections[venue]);
                    const vSpread = venueDepth?.spread ?? 0;

                    return (
                        <Fragment key={venue}>
                            {idx > 0 && (
                                <div className="w-px shrink-0 self-stretch bg-gray-800" aria-hidden />
                            )}
                            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                                {status === 'error' ? (
                                    <PaneUnavailable
                                        label={VENUE_LABELS[venue]}
                                        detail={connections[venue]?.errorMessage}
                                    />
                                ) : status === 'loading' ? (
                                    <DepthChartSkeletonColumn className="min-h-0 flex-1" />
                                ) : venueDepth ? (
                                    <DepthGrid
                                        bidLevels={venueDepth.bids}
                                        askLevels={venueDepth.asks}
                                        maxCumulativeSize={venueDepth.maxCumulativeSize}
                                        maxCumulativeDollar={venueDepth.maxCumulativeDollar}
                                        baseSymbol={asset}
                                        venues={[venue]}
                                        showYAxis={idx === 0}
                                        midPriceLabel={formatMidPriceLabel(
                                            venueDepth.midPrice,
                                            depthAxisFractionDigits(
                                                asset,
                                                priceFractionDigitsForTick(venueDepth.displayTickSize),
                                            ),
                                        )}
                                        midPrice={venueDepth.midPrice ?? 0}
                                        spreadAbs={vSpread}
                                        priceFractionDigits={depthAxisFractionDigits(
                                            asset,
                                            priceFractionDigitsForTick(venueDepth.displayTickSize),
                                        )}
                                        className="min-w-0"
                                    />
                                ) : (
                                    <SplitVenuePlaceholder label={VENUE_LABELS[venue]} />
                                )}
                            </div>
                        </Fragment>
                    );
                })}
            </div>
        );
    }

    // ── Aggregated layout: single panel merging all selected venues ─────
    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <DepthGrid
                bidLevels={aggregated.bids}
                askLevels={aggregated.asks}
                maxCumulativeSize={aggregated.maxCumulativeSize}
                maxCumulativeDollar={aggregated.maxCumulativeDollar}
                baseSymbol={asset}
                venues={selectedVenues}
                showYAxis
                midPriceLabel={midPriceLabel}
                midPrice={midPrice}
                spreadAbs={spreadAbs}
                priceFractionDigits={aggPriceDigits}
                className="min-h-0 flex-1"
            />
        </div>
    );
}