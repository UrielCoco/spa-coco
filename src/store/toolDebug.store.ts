import { create } from "zustand";

type State = {
  lastToolRaw: string | null;
  lastToolParsed: any | null;
  setLastToolRaw: (s: string) => void;
  setLastToolParsed: (v: any) => void;
  clear: () => void;
};

export const useToolDebug = create<State>((set) => ({
  lastToolRaw: null,
  lastToolParsed: null,
  setLastToolRaw: (s) => set({ lastToolRaw: s }),
  setLastToolParsed: (v) => set({ lastToolParsed: v }),
  clear: () => set({ lastToolRaw: null, lastToolParsed: null }),
}));
