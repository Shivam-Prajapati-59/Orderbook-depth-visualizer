import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { VENUE, type VenueId } from '../constants';

// How the multi-venue depth chart is laid out
export type DisplayMode = 'aggregated' | 'split';

// Number of price levels visible in the depth chart
export type DepthLevelOption = 5 | 10 | 15 | 20;

// Persistent shape stored in the depth-setting store
interface DepthSetting {
    displayMode: DisplayMode;
    depthLevels: DepthLevelOption;
    selectedVenues: VenueId[];
}

// Actions that mutate the depth settings
interface DepthSettingActions {
    setDisplayMode: (mode: DisplayMode) => void;
    setDepthLevels: (depth: DepthLevelOption) => void;
    setSelectedVenues: (venues: VenueId[]) => void;
    toggleVenue: (id: VenueId) => void;
    reset: () => void;
}

// Shared initial state so reset() stays in sync with the default values
const INITIAL_STATE: DepthSetting = {
    displayMode: 'aggregated',
    depthLevels: 10,
    selectedVenues: [VENUE.HYPERLIQUID, VENUE.LIGHTER, VENUE.PACIFICA, VENUE.ASTER],
};

export const useDepthSettingsStore = create<DepthSetting & DepthSettingActions>()(
    persist(
        (set, get) => ({
            ...INITIAL_STATE,

            // Toggle a venue in/out of the selected list
            toggleVenue: (id: VenueId) => {
                const { selectedVenues } = get();
                const newVenues = selectedVenues.includes(id)
                    ? selectedVenues.filter((venue) => venue !== id)
                    : [...selectedVenues, id];
                set({ selectedVenues: newVenues });
            },
            setDisplayMode: (mode: DisplayMode) => set({ displayMode: mode }),
            setDepthLevels: (depth: DepthLevelOption) => set({ depthLevels: depth }),
            setSelectedVenues: (venues: VenueId[]) => set({ selectedVenues: venues }),
            reset: () => set({ ...INITIAL_STATE }),
        }),
        {
            name: 'orderbook-settings',
            version: 1,
            migrate: (persisted) => persisted as unknown as DepthSetting,
            // Only persist the settings, not the actions (though functions aren't serialized anyway, it's good practice)
            partialize: (state) => ({
                displayMode: state.displayMode,
                depthLevels: state.depthLevels,
                selectedVenues: state.selectedVenues,
            }),
            merge: (persisted, current) => {
                const p = (persisted ?? {}) as Partial<DepthSetting>;
                return {
                    ...current,
                    displayMode: p.displayMode === 'aggregated' || p.displayMode === 'split'
                        ? p.displayMode
                        : INITIAL_STATE.displayMode,
                    depthLevels: p.depthLevels === 5 || p.depthLevels === 10 || p.depthLevels === 15 || p.depthLevels === 20
                        ? p.depthLevels
                        : INITIAL_STATE.depthLevels,
                    selectedVenues: Array.isArray(p.selectedVenues)
                        ? [...new Set(p.selectedVenues.filter((v): v is VenueId =>
                            v === VENUE.HYPERLIQUID || v === VENUE.LIGHTER || v === VENUE.PACIFICA || v === VENUE.ASTER,
                        ))]
                        : INITIAL_STATE.selectedVenues,
                };
            },
        })
);