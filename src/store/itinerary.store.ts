import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AnyRec = Record<string, any>;

export interface Itinerary {
  meta?: { tripTitle?: string; [k: string]: any };
  summary?: AnyRec;
  flights?: AnyRec[];
  days?: AnyRec[];
  transports?: AnyRec[];
  extras?: AnyRec[];
  lights?: AnyRec;
}

export interface ItineraryStore {
  itinerary: Itinerary;
  /** Reemplaza todo el itinerario */
  replace: (it: Itinerary) => void;
  /** Merge superficial del itinerario */
  merge: (partial: Partial<Itinerary>) => void;
  /** Carga JSON (string u objeto). Por defecto reemplaza; con mode="merge" hace merge. */
  loadFromJSON: (json: string | object, mode?: "replace" | "merge") => void;
  /** Vuelve al estado inicial */
  reset: () => void;
}

const INITIAL: Itinerary = {
  meta: { tripTitle: "New Trip" },
  summary: {},
  flights: [],
  days: [],
  transports: [],
  extras: [],
  lights: {},
};

function normalize(it: Partial<Itinerary>): Itinerary {
  return {
    meta: it.meta ?? { tripTitle: "New Trip" },
    summary: it.summary ?? {},
    flights: Array.isArray(it.flights) ? it.flights : [],
    days: Array.isArray(it.days) ? it.days : [],
    transports: Array.isArray(it.transports) ? it.transports : [],
    extras: Array.isArray(it.extras) ? it.extras : [],
    lights: it.lights ?? {},
  };
}

export const useItinerary = create<ItineraryStore>()(
  persist(
    (set, get) => ({
      itinerary: INITIAL,

      replace: (it) => set({ itinerary: normalize(it) }),

      merge: (partial) =>
        set({ itinerary: normalize({ ...get().itinerary, ...partial }) }),

      loadFromJSON: (json, mode = "replace") => {
        let obj: any = json;
        if (typeof json === "string") {
          try {
            obj = JSON.parse(json);
          } catch {
            console.warn("JSON inválido pasado a loadFromJSON");
            return;
          }
        }
        if (mode === "merge") {
          const merged = { ...get().itinerary, ...obj };
          set({ itinerary: normalize(merged) });
        } else {
          set({ itinerary: normalize(obj) });
        }
      },

      reset: () => set({ itinerary: INITIAL }),
    }),
    { name: "itinerary-store" }
  )
);

/** Utilidad opcional para descargar el JSON actual */
export function downloadJSON(filename = "itinerary.json") {
  const data = useItinerary.getState().itinerary;
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type { Itinerary as ItineraryType };
