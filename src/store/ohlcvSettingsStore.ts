import { create } from 'zustand';
import { VENUE } from '@/src/features/orderbook/constants';

export type OhlcvTimeframe = '1m' | '5m' | '15m' | '1h';
export type OhlcvChartMode = 'candles' | 'compare';
export type VenueId = 'hyperliquid' | 'lighter' | 'pacifica' | 'aster';

interface OhlcvSettings {
    timeframe: OhlcvTimeframe;
    setTimeframe: (timeframe: OhlcvTimeframe) => void;
    chartMode: OhlcvChartMode;
    setChartMode: (chartMode: OhlcvChartMode) => void;
    candleVenue: VenueId;
    setCandleVenue: (venue: VenueId) => void;
}

export const useOhlcvSettingsStore = create<OhlcvSettings>((set) => ({
    timeframe: '1m',
    setTimeframe: (timeframe) => set({ timeframe }),
    chartMode: 'candles',
    setChartMode: (chartMode) => set({ chartMode }),
    candleVenue: VENUE.HYPERLIQUID,
    setCandleVenue: (candleVenue) => set({ candleVenue }),
}));

