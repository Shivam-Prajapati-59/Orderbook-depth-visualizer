'use client';

import { useDepthSettingsStore } from '../store/depthSettingStore';
import { VENUE_DEPTH_HEX, VENUE_LABELS } from '../constants';

export function VenueLegend() {
    const selectedVenues = useDepthSettingsStore((s) => s.selectedVenues);

    if (selectedVenues.length === 0) return null;

    const row = (side: 'ask' | 'bid', label: string) => (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-3">
            <span className="w-9 shrink-0 font-mono text-[10px] font-medium tracking-wide text-gray-500 sm:w-10 sm:text-[11px]">
                {label}
            </span>
            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 sm:gap-x-5">
                {selectedVenues.map((v) => (
                    <span
                        key={v}
                        className="flex items-center gap-1.5 font-mono text-[10px] text-gray-300 sm:text-[11px]"
                    >
                        <span
                            className="size-2 shrink-0 rounded-full ring-1 ring-black/35"
                            style={{ backgroundColor: VENUE_DEPTH_HEX[v][side] }}
                        />
                        {VENUE_LABELS[v]}
                    </span>
                ))}
            </div>
        </div>
    );

    return (
        <div
            className="shrink-0 border-t border-[#1E2329] bg-[#0B0E11]/80 px-3 py-2.5 sm:px-4"
            aria-label="Order book colors by venue"
        >
            <div className="flex flex-col gap-2.5">
                {row('ask', 'Asks')}
                {row('bid', 'Bids')}
            </div>
        </div>
    );
}
