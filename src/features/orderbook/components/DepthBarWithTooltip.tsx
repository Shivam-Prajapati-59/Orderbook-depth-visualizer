'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/src/components/ui/tooltip';

import { buildTooltipFromLevel } from '../lib/depthTooltip';
import { DepthBar } from './DepthBar';
import { DepthTooltipCard } from './DepthTooltip';
import type { DepthBarWithTooltipProps } from '../componentProps';

export function DepthBarWithTooltip({
    level,
    side,
    segments,
    annotation,
    venueScope,
    maxCumulativeSize,
    maxCumulativeDollar,
    baseSymbol,
    priceFractionDigits,
    rowHeightPx,
}: DepthBarWithTooltipProps) {
    const data = buildTooltipFromLevel(
        level,
        side,
        venueScope,
        maxCumulativeSize,
        maxCumulativeDollar,
        baseSymbol,
        priceFractionDigits,
    );

    return (
        <TooltipProvider delay={0}>
            <Tooltip>
                <TooltipTrigger
                    render={<div className="flex h-full min-h-0 w-full min-w-0 cursor-default items-center outline-none" />}
                >
                    <DepthBar
                        side={side}
                        segments={segments}
                        annotation={annotation}
                        rowHeightPx={rowHeightPx}
                    />
                </TooltipTrigger>
                <TooltipContent
                    side="top"
                    sideOffset={6}
                    className="max-w-none border-0 bg-transparent p-0 shadow-none [&>svg]:hidden"
                >
                    <DepthTooltipCard data={data} />
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
