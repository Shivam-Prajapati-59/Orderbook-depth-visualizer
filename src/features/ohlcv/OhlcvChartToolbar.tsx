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
import { VENUE, VENUE_LABELS } from '@/src/features/constant';

import { toolbarBtn, toggleItem, toggleStrip } from './lib/chartToolbarStyles';
import { useOhlcvSettingsStore, type OhlcvTimeframe, type VenueId } from '../store/ohlcvSettingsStore';

const venueOrder: VenueId[] = [VENUE.HYPERLIQUID, VENUE.LIGHTER];

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

    // Base UI ToggleGroup uses string[] for value — memoize to avoid needless re-renders
    const timeframeArr = [timeframe] as string[];
    const chartModeArr = [chartMode] as string[];

    return (
        <header className="shrink-0 border-b border-[#1E2329] bg-[#0B0E11] px-2 py-1.5 sm:px-3">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                {/* ── Left cluster ── */}
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 sm:gap-x-3">

                    {/* Label pill */}
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-0.5 shrink-0 rounded-full bg-[#F0B90B]/80" aria-hidden />
                        <span className="font-mono text-[10px] font-medium tracking-wide text-gray-500">
                            Chart
                        </span>
                    </div>

                    <div className="hidden h-4 w-px shrink-0 bg-gray-800/90 sm:block" aria-hidden />

                    {/* Venue dropdown — only visible in candles mode */}
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
                        className={toggleStrip}
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
                <div className="flex shrink-0 items-center sm:pl-1">
                    <ToggleGroup
                        value={chartModeArr}
                        onValueChange={(val) => {
                            const next = val[0];
                            if (next === 'candles' || next === 'compare') setChartMode(next);
                        }}
                        spacing={0}
                        className={toggleStrip}
                    >
                        <ToggleGroupItem
                            value="candles"
                            aria-label="Candles"
                            className={cn(toggleItem, 'flex items-center justify-center gap-0.5 px-2.5')}
                        >
                            <BarChart3 className="size-2.5 opacity-90" aria-hidden />
                            Candles
                        </ToggleGroupItem>
                        <ToggleGroupItem
                            value="compare"
                            aria-label="Compare venues"
                            className={cn(toggleItem, 'flex items-center justify-center gap-0.5 px-2.5')}
                        >
                            <GitCompare className="size-2.5 opacity-90" aria-hidden />
                            Compare
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
            </div>
        </header>
    );
}

export default OhlcvChartToolbar;