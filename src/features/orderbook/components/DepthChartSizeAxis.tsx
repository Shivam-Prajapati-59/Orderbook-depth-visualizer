'use client';

import { useMemo } from 'react';

import { buildSizeAxisTicks, formatCompactUsd } from '../lib/depthSizeAxis';
import { Y_AXIS_W } from '../lib/depthChartLayout';
import type { DepthChartSizeAxisProps } from '../componentProps';

export function DepthChartSizeAxis({
    maxCumulative,
    midPrice,
    baseSymbol,
    showYSpacer,
}: DepthChartSizeAxisProps) {
    const ticks = useMemo(() => buildSizeAxisTicks(maxCumulative), [maxCumulative]);

    const showUsdRow = Number.isFinite(midPrice) && midPrice > 0;

    return (
        <div className="mt-1 flex w-full shrink-0 flex-col gap-0.5 border-t border-gray-800/50 pt-1.5">
            <div className="flex flex-row">
                {showYSpacer ? <div className="shrink-0" style={{ width: Y_AXIS_W }} aria-hidden /> : null}
                <div className="flex min-w-0 flex-1 flex-row justify-between px-0.5 font-mono text-[9px] leading-none font-medium text-gray-400 sm:px-1">
                    {ticks.map((t) => (
                        <div key={`depth-axis-base-${t}`} className="flex flex-col items-center gap-0.5">
                            <span className="text-center tabular-nums text-gray-400 transition-opacity duration-200 ease-out motion-reduce:transition-none">
                                {t.toLocaleString('en-US')} {baseSymbol}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="shrink-0" style={{ width: Y_AXIS_W }} aria-hidden />
            </div>
            {showUsdRow ? (
                <div className="flex flex-row">
                    {showYSpacer ? (
                        <div className="shrink-0" style={{ width: Y_AXIS_W }} aria-hidden />
                    ) : null}
                    <div className="flex min-w-0 flex-1 flex-row justify-between px-0.5 sm:px-1">
                        {ticks.map((t) => (
                            <span
                                key={`depth-axis-usd-${t}`}
                                className="text-center font-mono text-[8px] leading-none font-medium tabular-nums text-gray-600 transition-opacity duration-200 ease-out motion-reduce:transition-none"
                            >
                                {formatCompactUsd(t * midPrice)}
                            </span>
                        ))}
                    </div>
                    <div className="shrink-0" style={{ width: Y_AXIS_W }} aria-hidden />
                </div>
            ) : null}
            {showUsdRow ? (
                <p className="pl-0.5 text-[7px] leading-tight text-gray-600 sm:pl-1">
                    Cumulative $ row ≈ mid × size tick (same horizontal scale as bars).
                </p>
            ) : null}
        </div>
    );
}