'use client';

import { BarChart3, ChevronDown, GitCompare } from 'lucide-react';

import { Button } from '@/src/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@/src/components/ui/toggle-group';
import { VenueLogo } from '@/src/components/venue/VenueLogo';
import { cn } from '@/src/lib/utils';
import { VENUE, VENUE_LABELS } from '@/src/features/orderbook/constants';

import { toolbarBtn, toggleItem, toggleStrip } from '../lib/chartToolbarStyles';
import { useOhlcvSettingsStore, type OhlcvTimeframe, type VenueId } from '../../../store/ohlcvSettingsStore';

const venueOrder: VenueId[] = [VENUE.HYPERLIQUID, VENUE.LIGHTER, VENUE.PACIFICA, VENUE.ASTER];

function venueTriggerLabel(venues: VenueId[]) {
    if (venues.length === 0) return 'Select venues';
    if (venues.length === 1) return VENUE_LABELS[venues[0]!];
    return `${venues.length} venues`;
}

const timeframes: { id: OhlcvTimeframe; label: string }[] = [
    { id: '1m', label: '1m' },
    { id: '5m', label: '5m' },
    { id: '15m', label: '15m' },
    { id: '1h', label: '1h' },
];

export function OhlcvChartToolbar() {
    const chartMode = useOhlcvSettingsStore((s) => s.chartMode);
    const setChartMode = useOhlcvSettingsStore((s) => s.setChartMode);
    const timeframe = useOhlcvSettingsStore((s) => s.timeframe);
    const setTimeframe = useOhlcvSettingsStore((s) => s.setTimeframe);
    const candleVenue = useOhlcvSettingsStore((s) => s.candleVenue);
    const setCandleVenue = useOhlcvSettingsStore((s) => s.setCandleVenue);
    const compareVenues = useOhlcvSettingsStore((s) => s.compareVenues);
    const setCompareVenues = useOhlcvSettingsStore((s) => s.setCompareVenues);

    // Base UI ToggleGroup uses string[] for value — memoize to avoid needless re-renders
    const timeframeArr = [timeframe] as string[];
    const chartModeArr = [chartMode] as string[];

    return (
        <header className="shrink-0 border-b border-[#1E2329] bg-[#0B0E11] px-2 py-2 sm:px-3 xl:py-1.5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                {/* ── Left cluster ── */}
                <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-2 sm:flex-nowrap sm:gap-x-3 sm:gap-y-1.5">

                    {/* Label pill */}
                    <div className="flex basis-full items-center gap-1.5 sm:basis-auto">
                        <div className="h-3 w-0.5 shrink-0 rounded-full bg-[#F0B90B]/80" aria-hidden />
                        <span className="font-mono text-[11px] font-medium tracking-wide text-gray-500 sm:text-[14px]">
                            Chart
                        </span>
                    </div>

                    <div className="hidden h-4 w-px shrink-0 bg-gray-800/90 xl:block" aria-hidden />

                    {/* Candle venue dropdown */}
                    {chartMode === 'candles' && (
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className={cn(toolbarBtn, 'min-w-[120px] justify-between gap-2 sm:min-w-[136px]')}
                                    />
                                }
                            >
                                <span className="flex items-center gap-1.5 truncate">
                                    <VenueLogo venueId={candleVenue} size="md" />
                                    <span className="truncate">{VENUE_LABELS[candleVenue]}</span>
                                </span>
                                <ChevronDown className="size-3 shrink-0 text-gray-500" />
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                                align="start"
                                className="min-w-[140px] border-[#2B3139] bg-[#141920] p-1 shadow-xl"
                            >
                                {venueOrder.map((id) => (
                                    <DropdownMenuCheckboxItem
                                        key={id}
                                        checked={candleVenue === id}
                                        onCheckedChange={() => setCandleVenue(id)}
                                        className="cursor-pointer rounded text-[12px] text-gray-200 focus:bg-white/6"
                                    >
                                        <span className="flex items-center gap-2">
                                            <VenueLogo venueId={id} size="md" />
                                            {VENUE_LABELS[id]}
                                        </span>
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {/* Compare venue selection */}
                    {chartMode === 'compare' && (
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className={cn(toolbarBtn, 'min-w-28 justify-between gap-2 sm:min-w-32')}
                                    />
                                }
                            >
                                <span className="flex min-w-0 items-center gap-1.5">
                                    <span className="flex shrink-0 -space-x-1.5">
                                        {compareVenues.map((id) => (
                                            <VenueLogo
                                                key={id}
                                                venueId={id}
                                                size="sm"
                                                className="ring-2 ring-[#0B0E11]"
                                            />
                                        ))}
                                    </span>
                                    <span className="truncate">{venueTriggerLabel(compareVenues)}</span>
                                </span>
                                <ChevronDown className="size-3 shrink-0 text-gray-500" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="start"
                                className="w-(--anchor-width) min-w-32 border-[#2B3139] bg-[#141920] p-1 shadow-xl"
                            >
                                {venueOrder.map((id) => (
                                    <DropdownMenuCheckboxItem
                                        key={id}
                                        checked={compareVenues.includes(id)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                if (!compareVenues.includes(id)) {
                                                    setCompareVenues([...compareVenues, id]);
                                                }
                                            } else if (compareVenues.length > 1) {
                                                setCompareVenues(compareVenues.filter((venue) => venue !== id));
                                            }
                                        }}
                                        className="cursor-pointer rounded font-mono text-[10px] text-gray-200 focus:bg-white/6"
                                    >
                                        <span className="flex min-w-0 flex-1 items-center gap-2">
                                            <VenueLogo venueId={id} size="md" />
                                            <span className="min-w-0 flex-1">
                                                <span className="block leading-tight">{VENUE_LABELS[id]}</span>
                                            </span>
                                        </span>
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {/* Timeframe toggles */}
                    <ToggleGroup
                        value={timeframeArr}
                        onValueChange={(val) => {
                            const next = val[0];
                            if (next === '1m' || next === '5m' || next === '15m' || next === '1h') {
                                setTimeframe(next);
                            }
                        }}
                        spacing={0}
                        className={cn(toggleStrip, 'ml-auto sm:ml-0')}
                    >
                        {timeframes.map((tf) => (
                            <ToggleGroupItem
                                key={tf.id}
                                value={tf.id}
                                aria-label={`Timeframe ${tf.label}`}
                                className={cn(toggleItem, 'min-w-8')}
                            >
                                {tf.label}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </div>

                {/* ── Right cluster: chart-mode toggles ── */}
                <div className="flex w-full items-center sm:w-auto xl:pl-1">
                    <ToggleGroup
                        value={chartModeArr}
                        onValueChange={(val) => {
                            const next = val[0];
                            if (next === 'candles' || next === 'compare') setChartMode(next);
                        }}
                        spacing={0}
                        className={cn(toggleStrip, 'w-full sm:w-auto')}
                    >
                        <ToggleGroupItem
                            value="candles"
                            aria-label="Candles"
                            className={cn(toggleItem, 'flex flex-1 items-center justify-center gap-0.5 px-2.5 sm:flex-none')}
                        >
                            <BarChart3 className="size-3 opacity-90" aria-hidden />
                            Candles
                        </ToggleGroupItem>
                        <ToggleGroupItem
                            value="compare"
                            aria-label="Compare venues"
                            className={cn(toggleItem, 'flex flex-1 items-center justify-center gap-0.5 px-2.5 sm:flex-none')}
                        >
                            <GitCompare className="size-3 opacity-90" aria-hidden />
                            Compare
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
            </div>
        </header>
    );
}

export default OhlcvChartToolbar;
