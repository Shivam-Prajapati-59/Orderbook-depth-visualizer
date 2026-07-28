import { create } from 'zustand';

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

export const useDepthSettingStore = create<DepthSetting & DepthSettingActions>((set, get) => ({
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
}));