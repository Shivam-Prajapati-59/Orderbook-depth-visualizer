import { cn } from '@/src/lib/utils';

import type { DepthTooltipCardProps } from '../componentProps';
import type { DepthTooltipData } from '../types';

export type { DepthTooltipData };

export function DepthTooltipCard({ data, className }: DepthTooltipCardProps) {
    const baseSymbol = data.baseSymbol;
    const showLevelTotal = data.venues.length > 1;

    return (
        <div
            className={cn(
                'max-w-[220px] rounded-md border border-gray-700/90 bg-[#1a1f26] px-2 py-1.5 text-[#EAECEF] shadow-md',
                className,
            )}
        >
            <div className="mb-1 flex items-baseline justify-between gap-2 border-b border-gray-800/80 pb-1">
                <span className="text-[10px] font-medium tracking-wide text-gray-500 uppercase">
                    Price
                </span>
                <span className="font-mono text-[13px] font-bold leading-none text-[#F0B90B] tabular-nums">
                    {data.price}
                </span>
            </div>
            <div className={cn('space-y-1', showLevelTotal ? 'mb-1' : 'mb-0')}>
                {data.venues.map((v) => (
                    <div
                        key={v.name}
                        className="flex items-center justify-between gap-2 text-[9px] leading-tight"
                    >
                        <div className="flex min-w-0 items-center gap-1.5">
                            <div className="size-2 shrink-0 rounded-xs" style={{ backgroundColor: v.color }} />
                            <span className="truncate text-gray-400">{v.name}</span>
                        </div>
                        <div className="shrink-0 text-right">
                            <div className="font-mono font-semibold tabular-nums text-white">
                                {v.amountBase} {baseSymbol}
                            </div>
                            <div className="font-mono text-[8px] tabular-nums text-gray-500">{v.amountUsd}</div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="space-y-1 border-t border-gray-800/80 pt-1">
                {showLevelTotal ? (
                    <div className="flex justify-between gap-2 text-[8px] leading-tight">
                        <span className="shrink-0 font-semibold text-gray-500 uppercase">Level Σ</span>
                        <div className="text-right">
                            <span className="font-mono font-semibold tabular-nums text-white">
                                {data.levelSizeBase} {baseSymbol}
                            </span>
                            <span className="ml-1 font-mono text-[8px] tabular-nums text-gray-500">
                                {data.levelUsd}
                            </span>
                        </div>
                    </div>
                ) : null}
                <div className="flex justify-between gap-2 text-[8px] leading-tight">
                    <span className="shrink-0 font-semibold text-gray-500 uppercase">Cumul.</span>
                    <div className="text-right">
                        <span className="font-mono font-semibold tabular-nums text-[#0ECB81]">
                            {data.cumulativeBase} {baseSymbol}
                        </span>
                        <span className="ml-1 font-mono text-[8px] tabular-nums text-gray-300">
                            {data.cumulativeUsd}
                        </span>
                    </div>
                </div>
                <div className="flex justify-between text-[8px] leading-tight text-gray-500">
                    <span>% max</span>
                    <span className="font-mono text-gray-400 tabular-nums">
                        {data.pctOfBook}%
                    </span>
                </div>
            </div>
        </div>
    );
}