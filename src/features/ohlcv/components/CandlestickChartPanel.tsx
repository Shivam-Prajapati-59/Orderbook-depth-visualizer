'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { VENUE } from '@/src/features/orderbook/constants';
import { useMarketStore } from '@/src/store/marketStore';

import { type CompareLineHoverPayload, useOhlcvChart } from '../hooks/useOhlcvChart';
import { useHyperliquidCandlesStream } from '../hooks/useHyperliquidCandlesStream';
import { useLighterCandlesPoll } from '../hooks/useLighterCandlePoll';
import { usePacificaCandlesStream } from '../hooks/usePacificaCandlesStore';
import { useAsterCandlesStream } from '../hooks/useAsterCandlesStore';
import { useOhlcvFeedErrorToasts } from '../hooks/useOhlcvFeedError';
import { buildCompareLineTooltipData } from './CompareLineTooltip';
import { OhlcvChartArea } from './OhlcvChartArea';
import { OhlcvChartToolbar } from './OhlcvChartToolbar';
import { useHyperliquidCandlesStore } from '../store/hyperLiquidCandlesStore';
import { useLighterCandlesStore } from '../store/lighterCandlesStore';
import { usePacificaCandlesStore } from '../store/pacificaCandlesStore';
import { useAsterCandlesStore } from '../store/asterCandlesStore';
import { useOhlcvSettingsStore } from '@/src/store/ohlcvSettingsStore';

export function CandlestickChartPanel() {
    const chartMode = useOhlcvSettingsStore((s) => s.chartMode);
    const timeframe = useOhlcvSettingsStore((s) => s.timeframe);
    const candleVenue = useOhlcvSettingsStore((s) => s.candleVenue);
    const compareVenues = useOhlcvSettingsStore((s) => s.compareVenues);
    const selectedAsset = useMarketStore((s) => s.selectedMarketId);

    const isCompareVenueSelected = (venue: string) => compareVenues.includes(venue as (typeof compareVenues)[number]);
    const hlCandlesEnabled = chartMode === 'compare' ? isCompareVenueSelected(VENUE.HYPERLIQUID) : candleVenue === VENUE.HYPERLIQUID;
    const lighterCandlesEnabled = chartMode === 'compare' ? isCompareVenueSelected(VENUE.LIGHTER) : candleVenue === VENUE.LIGHTER;
    const pacificaCandlesEnabled = chartMode === 'compare' ? isCompareVenueSelected(VENUE.PACIFICA) : candleVenue === VENUE.PACIFICA;
    const asterCandlesEnabled = chartMode === 'compare' ? isCompareVenueSelected(VENUE.ASTER) : candleVenue === VENUE.ASTER;

    useHyperliquidCandlesStream({
        asset: selectedAsset,
        timeframe,
        enabled: hlCandlesEnabled,
    });

    useLighterCandlesPoll({
        asset: selectedAsset,
        timeframe,
        enabled: lighterCandlesEnabled,
    });

    usePacificaCandlesStream({
        asset: selectedAsset,
        timeframe,
        enabled: pacificaCandlesEnabled,
    });

    useAsterCandlesStream({
        asset: selectedAsset,
        timeframe,
        enabled: asterCandlesEnabled,
    });

    useOhlcvFeedErrorToasts({
        asset: selectedAsset,
        timeframe,
        hlCandlesEnabled,
        lighterCandlesEnabled,
        pacificaCandlesEnabled,
        asterCandlesEnabled,
    });

    const hlBars = useHyperliquidCandlesStore((s) => s.bars);
    const lighterBars = useLighterCandlesStore((s) => s.bars);
    const pacificaBars = usePacificaCandlesStore((s) => s.bars);
    const asterBars = useAsterCandlesStore((s) => s.bars);

    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [compareHover, setCompareHover] = useState<CompareLineHoverPayload | null>(null);

    const onCompareLineHover = useCallback((payload: CompareLineHoverPayload | null) => {
        setCompareHover(payload);
    }, []);

    const visibleCompareHover = chartMode === 'compare' ? compareHover : null;

    const compareTooltipData = useMemo(() => {
        if (!visibleCompareHover) return null;
        return buildCompareLineTooltipData(visibleCompareHover, timeframe);
    }, [visibleCompareHover, timeframe]);

    const compareTooltip = useMemo(() => {
        if (!visibleCompareHover || !compareTooltipData) return null;
        return {
            position: { x: visibleCompareHover.x, y: visibleCompareHover.y },
            data: compareTooltipData,
        };
    }, [visibleCompareHover, compareTooltipData]);

    const candleBars = useMemo(() => {
        switch (candleVenue) {
            case VENUE.HYPERLIQUID:
                return hlBars;
            case VENUE.LIGHTER:
                return lighterBars;
            case VENUE.PACIFICA:
                return pacificaBars;
            case VENUE.ASTER:
                return asterBars;
            default:
                return [];
        }
    }, [candleVenue, hlBars, lighterBars, pacificaBars, asterBars]);

    const compareSeries = useMemo(
        () => ({
            hyperliquid: hlCandlesEnabled ? hlBars : [],
            lighter: lighterCandlesEnabled ? lighterBars : [],
            pacifica: pacificaCandlesEnabled ? pacificaBars : [],
            aster: asterCandlesEnabled ? asterBars : [],
        }),
        [
            hlCandlesEnabled,
            hlBars,
            lighterCandlesEnabled,
            lighterBars,
            pacificaCandlesEnabled,
            pacificaBars,
            asterCandlesEnabled,
            asterBars,
        ],
    );

    const chartResetKey = useMemo(
        () => `${selectedAsset}:${timeframe}:${candleVenue}:${chartMode}:${compareVenues.join(',')}`,
        [selectedAsset, timeframe, candleVenue, chartMode, compareVenues],
    );

    useOhlcvChart(chartContainerRef, chartMode, candleBars, compareSeries, compareVenues, {
        chartResetKey,
        onCompareLineHover: chartMode === 'compare' ? onCompareLineHover : undefined,
    });

    return (
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
            <OhlcvChartToolbar />
            <OhlcvChartArea ref={chartContainerRef} compareTooltip={compareTooltip} />
        </div>
    );
}
