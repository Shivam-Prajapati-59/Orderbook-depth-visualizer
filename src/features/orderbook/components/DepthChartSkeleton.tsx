'use client';

import { cn } from '@/src/lib/utils';

/** Single venue column (used in split view when one side is still loading). */
export function DepthChartSkeletonColumn({ className }: { className?: string }) {
    return (
        <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col gap-px px-2 py-2', className)}>
            {Array.from({ length: 5 }).map((_, i) => (
                <div
                    key={`ask-${i}`}
                    className="h-5 w-full animate-pulse rounded-sm bg-white/[0.06]"
                    aria-hidden
                />
            ))}
            <div className="my-1 h-7 w-full animate-pulse rounded-sm bg-[#F0B90B]/12" aria-hidden />
            {Array.from({ length: 5 }).map((_, i) => (
                <div
                    key={`bid-${i}`}
                    className="h-5 w-full animate-pulse rounded-sm bg-white/[0.06]"
                    aria-hidden
                />
            ))}
            <div className="mt-2 h-8 w-full animate-pulse rounded-sm bg-white/[0.04]" aria-hidden />
        </div>
    );
}

export type DepthChartSkeletonProps = {
    variant: 'full' | 'split';
    className?: string;
};

export function DepthChartSkeleton({ variant, className }: DepthChartSkeletonProps) {
    if (variant === 'split') {
        return (
            <div
                className={cn('flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden', className)}
                role="status"
                aria-busy
                aria-label="Loading order book"
            >
                <DepthChartSkeletonColumn className="min-w-0" />
                <div className="w-px shrink-0 self-stretch bg-gray-800" aria-hidden />
                <DepthChartSkeletonColumn className="min-w-0" />
            </div>
        );
    }

    return (
        <div
            className={cn('flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden', className)}
            role="status"
            aria-busy
            aria-label="Loading order book"
        >
            <DepthChartSkeletonColumn />
        </div>
    );
}