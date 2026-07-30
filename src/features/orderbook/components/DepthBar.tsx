import { cn } from '@/src/lib/utils';

import type { DepthBarProps } from '../componentProps';

const annotationChip = 'border border-venue-hl-bid/50 bg-venue-hl-bid/15 text-venue-hl-bid';

export function DepthBar({ side, segments, annotation, className, rowHeightPx }: DepthBarProps) {
    void side;
    const fillRow = rowHeightPx == null;
    const hStyle = fillRow ? undefined : ({ height: rowHeightPx } as const);

    if (segments.length === 0) {
        return (
            <div
                className={cn(
                    'flex w-full items-center justify-start',
                    fillRow && 'h-full min-h-0',
                    className,
                )}
                style={hStyle}
            />
        );
    }

    const barTotalPct = segments.reduce((a, s) => a + s.widthPct, 0);

    const barWidthMotion =
        'transition-[width] duration-150 ease-out motion-reduce:transition-none motion-reduce:duration-0';
    const segmentMotion =
        'transition-[width,background-color] duration-150 ease-out motion-reduce:transition-none motion-reduce:duration-0';

    return (
        <div
            className={cn(
                'group relative flex w-full cursor-default items-center justify-start transition-colors duration-150 ease-out hover:bg-white/5 motion-reduce:transition-none',
                fillRow && 'h-full min-h-0',
                className,
            )}
            style={hStyle}
        >
            {annotation ? (
                <div
                    className={cn(
                        'absolute top-0 left-0 z-30 -translate-y-full whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-bold',
                        annotationChip,
                    )}
                >
                    {annotation}
                </div>
            ) : null}
            <div
                className={cn(
                    'flex h-full min-h-0 max-h-full max-w-full shrink-0 items-stretch overflow-hidden rounded-sm border border-gray-600/40',
                    barWidthMotion,
                )}
                style={{
                    width: barTotalPct > 0 ? `${barTotalPct}%` : undefined,
                }}
            >
                {segments.map((s, i) => (
                    <div
                        key={s.key}
                        className={cn(
                            'h-full min-w-[3px] shrink-0',
                            segmentMotion,
                            i < segments.length - 1 && 'border-r border-white/20',
                        )}
                        style={{
                            width: barTotalPct > 0 ? `${(s.widthPct / barTotalPct) * 100}%` : undefined,
                            backgroundColor: s.backgroundColor,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}