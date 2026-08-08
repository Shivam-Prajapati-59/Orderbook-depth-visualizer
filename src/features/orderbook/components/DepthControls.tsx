'use client';

import { Check, ChevronDown, Columns, LayoutGrid } from 'lucide-react';

import { Button } from '@/src/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@/src/components/ui/toggle-group';
import { VenueLogo } from '@/src/components/venue/VenueLogo';
import { cn } from '@/src/lib/utils';

import { VENUE, VENUE_DEPTH_HEX, VENUE_LABELS, type VenueId } from '../constants';
import { useDepthSettingsStore, type DepthLevelOption } from '../store/depthSettingStore';

const venueOrder: VenueId[] = [VENUE.HYPERLIQUID, VENUE.LIGHTER, VENUE.PACIFICA, VENUE.ASTER];

const depthOptions: DepthLevelOption[] = [5, 10, 15, 20];

function venueTriggerLabel(venues: VenueId[]) {
    if (venues.length === 0) return 'Select venues';
    if (venues.length === 1) return VENUE_LABELS[venues[0]!];
    return `${venues.length} venues`;
}
const toolbarBtn =
    'h-8 border-white/8 bg-[#0d1117] px-2 font-mono text-[12px] font-medium text-gray-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] hover:border-[#F0B90B]/30';

const toggleStrip =
    'inline-flex h-8 max-h-8 min-h-8 items-stretch overflow-hidden rounded-md border border-white/6 bg-[#0d1117] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]';

const toggleItem =
    'h-full min-h-0 max-h-full shrink-0 rounded-none border-0 px-2 font-mono text-[12px] font-medium uppercase tracking-wide shadow-none ring-0 transition-colors outline-none focus-visible:ring-0 aria-[pressed=false]:text-gray-500 aria-[pressed=false]:hover:bg-white/[0.04] aria-[pressed=false]:hover:text-gray-300 aria-pressed:bg-[#F0B90B]/12 aria-pressed:text-[#F0B90B]';

export function DepthControls() {
    const displayMode = useDepthSettingsStore((s) => s.displayMode);
    const setDisplayMode = useDepthSettingsStore((s) => s.setDisplayMode);
    const selectedVenues = useDepthSettingsStore((s) => s.selectedVenues);
    const toggleVenue = useDepthSettingsStore((s) => s.toggleVenue);
    const depthLevels = useDepthSettingsStore((s) => s.depthLevels);
    const setDepthLevels = useDepthSettingsStore((s) => s.setDepthLevels);

    return (
        <header className="shrink-0 border-b border-[#1E2329] bg-[#0B0E11] px-2 py-2 sm:px-3 xl:py-1.5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-2 sm:flex-nowrap sm:gap-x-3 sm:gap-y-1.5">
                    <div className="flex basis-full items-center gap-1.5 sm:basis-auto">
                        <div className="h-3 w-0.5 shrink-0 rounded-full bg-[#F0B90B]/80" aria-hidden />
                        <span className="font-mono text-[11px] font-medium tracking-wide text-gray-500 sm:text-[14px]">
                            Depth
                        </span>
                    </div>

                    <div className="hidden h-4 w-px shrink-0 bg-gray-800/90 xl:block" aria-hidden />

                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button
                                    type="button"
                                    variant="outline"
                                    className={cn(toolbarBtn, 'min-w-0 flex-1 justify-between gap-2 sm:min-w-32 sm:flex-none')}
                                >
                                    <span className="flex min-w-0 items-center gap-1.5">
                                        <span className="flex shrink-0 -space-x-1.5">
                                            {selectedVenues.map((id) => (
                                                <VenueLogo
                                                    key={id}
                                                    venueId={id}
                                                    size="md"
                                                    className="ring-2 ring-[#0B0E11]"
                                                />
                                            ))}
                                        </span>
                                        <span className="truncate text-[12px]">{venueTriggerLabel(selectedVenues)}</span>
                                    </span>
                                    <ChevronDown className="size-3.5 shrink-0 text-gray-500" />
                                </Button>
                            }
                        />
                        <DropdownMenuContent
                            align="start"
                            className="w-(--radix-dropdown-menu-trigger-width) border-[#2B3139] bg-[#141920] p-1 shadow-xl"
                        >
                            {venueOrder.map((id) => (
                                <DropdownMenuCheckboxItem
                                    key={id}
                                    checked={selectedVenues.includes(id)}
                                    onCheckedChange={() => toggleVenue(id)}
                                    className="cursor-pointer rounded text-[12px] text-gray-200 focus:bg-white/6"
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

                    {selectedVenues.length > 0 ? (
                        <div
                            className="hidden min-w-0 flex-wrap items-center gap-x-2 gap-y-1 border-l border-gray-800/90 pl-2 sm:flex sm:gap-x-2.5 sm:pl-3 lg:gap-x-3"
                            role="group"
                            aria-label="Depth bar colors: left chip is bid, right chip is ask per venue"
                        >
                            {selectedVenues.map((id) => (
                                <span key={id} className="flex overflow-hidden rounded" aria-hidden>
                                    <span className="h-3 w-3" style={{ backgroundColor: VENUE_DEPTH_HEX[id].bid }} />
                                    <span className="h-3 w-3" style={{ backgroundColor: VENUE_DEPTH_HEX[id].ask }} />
                                </span>
                            ))}
                            <span className="sr-only">
                                Bid and ask colors per venue:{' '}
                                {selectedVenues
                                    .map(
                                        (id) =>
                                            `${VENUE_LABELS[id]} bid ${VENUE_DEPTH_HEX[id].bid}, ask ${VENUE_DEPTH_HEX[id].ask}`,
                                    )
                                    .join('; ')}
                                .
                            </span>
                        </div>
                    ) : null}
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button
                                    type="button"
                                    variant="outline"
                                    className={cn(toolbarBtn, 'min-w-0 flex-1 justify-between gap-3 sm:min-w-30 sm:flex-none')}
                                >
                                    <span className="flex items-baseline gap-1.5 truncate  text-[12px]">
                                        <span className="text-gray-500">Levels</span>
                                        <span className="tabular-nums text-gray-200">{depthLevels}</span>
                                    </span>
                                    <ChevronDown className="size-3.5 shrink-0 text-gray-500" />
                                </Button>
                            }
                        />
                        <DropdownMenuContent
                            align="start"
                            className="border-[#2B3139] bg-[#141920] p-2 shadow-xl"
                        >
                            {depthOptions.map((opt) => (
                                <DropdownMenuItem
                                    key={opt}
                                    className="flex cursor-pointer items-center justify-between gap-3 font-mono text-[12px] text-gray-200 focus:bg-white/6"
                                    onClick={() => setDepthLevels(opt)}
                                >
                                    <span>{opt} levels</span>
                                    {depthLevels === opt ? (
                                        <Check className="size-3 shrink-0 text-[#F0B90B]" aria-hidden />
                                    ) : null}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="flex w-full items-center sm:w-auto xl:pl-1">
                    <ToggleGroup
                        value={[displayMode] as readonly string[]}
                        size="sm"
                        onValueChange={(v: string[]) => {
                            const mode = v[0];
                            if (mode === 'aggregated' || mode === 'split') setDisplayMode(mode);
                        }}
                        spacing={0}
                        className={cn(toggleStrip, 'w-full sm:w-auto')}
                    >
                        <ToggleGroupItem
                            value="aggregated"
                            aria-label="Aggregated"
                            className={cn(
                                toggleItem,
                                'flex flex-1 items-center justify-center gap-0.5 px-1.5 sm:flex-none',
                            )}
                        >
                            <LayoutGrid className="size-3 shrink-0 opacity-90" aria-hidden />
                            Aggregated
                        </ToggleGroupItem>
                        <ToggleGroupItem
                            value="split"
                            aria-label="Split"
                            className={cn(toggleItem, 'flex flex-1 items-center justify-center gap-0.5 px-2 sm:flex-none')}
                        >
                            <Columns className="size-3 shrink-0 opacity-90" aria-hidden />
                            Split
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
            </div>
        </header>
    );
}
