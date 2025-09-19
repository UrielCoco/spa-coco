// /lib/itinerary.ts
export type Itinerary = Record<string, any>;

export function deepMerge<T extends Record<string, any>>(target: T, patch: Partial<T>): T {
  const out: any = Array.isArray(target) ? [...target] : { ...(target ?? {}) };
  for (const [k, v] of Object.entries(patch ?? {})) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = deepMerge(out[k] ?? {}, v as any);
    } else {
      out[k] = v;
    }
  }
  return out;
}
