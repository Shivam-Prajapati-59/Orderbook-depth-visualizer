'use client';

import { cn } from '@/src/lib/utils';

export type OhlcvChartSkeletonProps = {
    className?: string;
};

export function OhlcvChartSkeleton({ className }: OhlcvChartSkeletonProps) {
    return (
        <div
            className={cn('flex min-h-0 min-w-0 flex-1 flex-col gap-2 px-1.5 pb-2 sm:px-2', className)}
            aria-busy
            aria-label="Loading chart"
        >
            <div className="min-h-0 flex-1 animate-pulse rounded-md bg-white/[0.05]" />
        </div>
    );
}