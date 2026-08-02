import { create } from "zustand";
import type { VenueConnectionState } from "@/src/adapters/base/types";
import type { OhlcvBar } from "../types";
import { mergeOhlcvBarsByOpenTime } from "../lib/mergeOhlcvBarsByOpenTime";

type ConnectionSlice = Pick<
  VenueConnectionState,
  "status" | "errorMessage" | "reconnectAttempts"
>;

type AsterCandleStore = {
  bars: OhlcvBar[];
  connection: ConnectionSlice | null;
  upsertBars: (incoming: OhlcvBar[]) => void;
  clear: () => void;
  setConnection: (c: VenueConnectionState) => void;
};

export const useAsterCandleStore = create<AsterCandleStore>((set, get) => ({
  bars: [],
  connection: null,
  upsertBars: (incoming) =>
    set((state) => ({
      bars: mergeOhlcvBarsByOpenTime(state.bars, incoming),
    })),
  clear: () => set({ bars: [], connection: null }),
  setConnection: (c) =>
    set({
      connection: {
        status: c.status,
        errorMessage: c.errorMessage,
        reconnectAttempts: c.reconnectAttempts,
      },
    }),
}));
