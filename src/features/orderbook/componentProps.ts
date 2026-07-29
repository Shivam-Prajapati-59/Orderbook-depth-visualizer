import type { VenueId } from '@/src/adapters/base/types';

import type { DepthLevel } from './aggregation/cumulative';
import type { DepthSegment } from './lib/depthSegments';
import type { DepthTooltipData } from './types';

export type DepthChartPanelProps = {
    bidLevels: DepthLevel[];
    askLevels: DepthLevel[];
    maxCumulativeSize: number;
    maxCumulativeDollar: number;
    baseSymbol: string;
    venues: VenueId[];
    showYAxis?: boolean;
    midPriceLabel: string;
    midPrice: number;
    spreadAbs: number;
    priceFractionDigits: number;
    className?: string;
};

export type DepthBarProps = {
    side: 'bid' | 'ask';
    segments: DepthSegment[];
    annotation?: string;
    className?: string;
    rowHeightPx?: number;
};

export type DepthBarWithTooltipProps = {
    level: DepthLevel;
    side: 'bid' | 'ask';
    segments: DepthSegment[];
    annotation?: string;
    venueScope: VenueId[];
    maxCumulativeSize: number;
    maxCumulativeDollar: number;
    baseSymbol: string;
    priceFractionDigits: number;
    rowHeightPx?: number;
};

export type DepthChartSizeAxisProps = {
    maxCumulative: number;
    midPrice: number;
    baseSymbol: string;
    showYSpacer: boolean;
};

export type DepthTooltipCardProps = {
    data: DepthTooltipData;
    className?: string;
};

export type SplitVenuePlaceholderProps = {
    label: string;
};