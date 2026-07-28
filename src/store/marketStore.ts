import { create } from 'zustand';
import { TRADE_MARKETS } from '@/src/config/trademarket';

interface MarketState {
    selectedMarketId: string;
    setSelectedMarketId: (id: string) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
    selectedMarketId: TRADE_MARKETS[0].id,
    setSelectedMarketId: (id) => set({ selectedMarketId: id }),
}));
