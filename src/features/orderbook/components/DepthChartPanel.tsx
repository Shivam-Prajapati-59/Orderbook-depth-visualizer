'use client';

import { Fragment, useMemo } from 'react';

import { cn } from '@/src/lib/utils';

import { askSegments, bidSegments } from '../lib/depthSegments';
import { fmtPriceWithDigits, MID_STRIP_H, ROW_EDGE, ROW_FR } from '../lib/depthChartLayout';
import { DepthBarWithTooltip } from './DepthBarWithTooltip';
import { DepthChartSizeAxis } from './DepthChartSizeAxis';
import type { DepthChartPanelProps } from '../componentProps';

export function DepthChartPanel({
    bidLevels,
    askLevels,
    maxCumulativeSize,
    maxCumulativeDollar,
    baseSymbol,
    venues,
    showYAxis,
    midPriceLabel,
    midPrice,
    spreadAbs,
    priceFractionDigits,
    className,
}: DepthChartPanelProps) {
    const priceFd = priceFractionDigits;

    /** Asks above mid: reverse so best ask sits just above the spread line */
    const asksTopToBottom = useMemo(() => [...askLevels].reverse(), [askLevels]);

    const bidCount = bidLevels.length;
    const askCount = askLevels.length;
    const totalRowCount = askCount + 1 + bidCount;

    const gridTemplateRows = useMemo(
        () =>
            [...Array(askCount).fill(ROW_FR), `${MID_STRIP_H}px`, ...Array(bidCount).fill(ROW_FR)].join(
                ' ',
            ),
        [bidCount, askCount],
    );

    const rowEdge = (gridRow: number) => (gridRow < totalRowCount ? ROW_EDGE : '');

    const midDivider = (
        <div className="relative h-full min-h-0 w-full overflow-visible bg-linear-to-b from-transparent via-white/3 to-transparent">
            <div className="absolute inset-x-0 top-1/2 z-0 h-px -translate-y-1/2 bg-[#F0B90B]/45 transition-opacity duration-200 ease-out motion-reduce:transition-none" />
            <div
                className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded border border-[#F0B90B]/45 bg-[#0B0E11]/95 px-1.5 py-0.5 text-center shadow-sm backdrop-blur-sm transition-[box-shadow,border-color] duration-200 ease-out motion-reduce:transition-none"
                role="status"
                aria-label={`Mid price ${midPriceLabel}, spread ${spreadAbs.toLocaleString('en-US', { minimumFractionDigits: priceFd, maximumFractionDigits: priceFd })}`}
            >
                <div className="font-mono text-[10px] font-bold leading-none tracking-tight text-[#F0B90B] tabular-nums transition-colors duration-150 ease-out motion-reduce:transition-none">
                    {midPriceLabel}
                </div>
                <div className="mt-0.5 font-mono text-[8px] leading-tight text-gray-400 transition-colors duration-150 ease-out motion-reduce:transition-none">
                    Spread{' '}
                    <span className="font-semibold text-gray-300">
                        {spreadAbs.toLocaleString('en-US', {
                            minimumFractionDigits: priceFd,
                            maximumFractionDigits: priceFd,
                        })}
                    </span>
                    <span className="text-gray-600">
                        {' '}
                        ({midPrice > 0 ? ((spreadAbs / midPrice) * 100).toFixed(3) : '0.000'}
                        %)
                    </span>
                </div>
            </div>
        </div>
    );

    return (
        <div
            className={cn(
                'depth-grid relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#0B0E11]',
                className,
            )}
        >
            <div className="flex min-h-0 min-w-0 flex-1 flex-col px-1.5 py-2 sm:px-2">
                <div
                    className={cn(
                        'grid min-h-0 w-full flex-1',
                        showYAxis ? 'grid-cols-[minmax(0,3.25rem)_minmax(0,1fr)]' : 'grid-cols-1',
                    )}
                    style={{ gridTemplateRows }}
                >
                    {/* Ask rows — rendered top to bottom (worst ask → best ask) */}
                    {asksTopToBottom.map((level, i) => (
                        <Fragment key={`ask-${venues.join('-')}-${level.bucketPrice}`}>
                            {showYAxis ? (
                                <div
                                    style={{ gridRow: i + 1, gridColumn: 1 }}
                                    className={cn(
                                        'flex min-h-0 flex-col items-end justify-center border-r border-gray-800/60 pr-0.5',
                                        rowEdge(i + 1),
                                    )}
                                >
                                    <span className="text-[9px] leading-none text-gray-500 tabular-nums transition-colors duration-150 ease-out motion-reduce:transition-none">
                                        {fmtPriceWithDigits(level.bucketPrice, priceFd)}
                                    </span>
                                </div>
                            ) : null}
                            <div
                                style={{ gridRow: i + 1, gridColumn: showYAxis ? 2 : 1 }}
                                className={cn(
                                    'flex h-full min-h-0 min-w-0 items-center justify-start pl-0',
                                    rowEdge(i + 1),
                                )}
                            >
                                <DepthBarWithTooltip
                                    level={level}
                                    side="ask"
                                    segments={askSegments(level, venues, maxCumulativeSize)}
                                    venueScope={venues}
                                    maxCumulativeSize={maxCumulativeSize}
                                    maxCumulativeDollar={maxCumulativeDollar}
                                    baseSymbol={baseSymbol}
                                    priceFractionDigits={priceFd}
                                />
                            </div>
                        </Fragment>
                    ))}

                    {/* Spread / mid price strip */}
                    {showYAxis ? (
                        <div
                            style={{ gridRow: askCount + 1, gridColumn: 1 }}
                            className={cn('min-h-0 border-r border-gray-800/60', rowEdge(askCount + 1))}
                            aria-hidden
                        />
                    ) : null}
                    <div
                        style={{ gridRow: askCount + 1, gridColumn: showYAxis ? 2 : 1 }}
                        className={cn('min-h-0 min-w-0', rowEdge(askCount + 1))}
                    >
                        {midDivider}
                    </div>

                    {/* Bid rows */}
                    {bidLevels.map((level, j) => (
                        <Fragment key={`bid-${venues.join('-')}-${level.bucketPrice}`}>
                            {showYAxis ? (
                                <div
                                    style={{ gridRow: askCount + 2 + j, gridColumn: 1 }}
                                    className={cn(
                                        'flex min-h-0 flex-col items-end justify-center border-r border-gray-800/60 pr-0.5',
                                        rowEdge(askCount + 2 + j),
                                    )}
                                >
                                    <span className="text-[9px] leading-none text-gray-500 tabular-nums transition-colors duration-150 ease-out motion-reduce:transition-none">
                                        {fmtPriceWithDigits(level.bucketPrice, priceFd)}
                                    </span>
                                </div>
                            ) : null}
                            <div
                                style={{
                                    gridRow: askCount + 2 + j,
                                    gridColumn: showYAxis ? 2 : 1,
                                }}
                                className={cn(
                                    'flex h-full min-h-0 min-w-0 items-center justify-start pl-0',
                                    rowEdge(askCount + 2 + j),
                                )}
                            >
                                <DepthBarWithTooltip
                                    level={level}
                                    side="bid"
                                    segments={bidSegments(level, venues, maxCumulativeSize)}
                                    venueScope={venues}
                                    maxCumulativeSize={maxCumulativeSize}
                                    maxCumulativeDollar={maxCumulativeDollar}
                                    baseSymbol={baseSymbol}
                                    priceFractionDigits={priceFd}
                                />
                            </div>
                        </Fragment>
                    ))}
                </div>

                <DepthChartSizeAxis
                    maxCumulative={maxCumulativeSize}
                    midPrice={midPrice}
                    baseSymbol={baseSymbol}
                    showYSpacer={Boolean(showYAxis)}
                />
            </div>
        </div>
    );
}