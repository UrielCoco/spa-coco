// src/services/parsers.ts
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/** merge inmutable (profunda) para objetos/arrays simples */
export function deepMerge<T extends object>(base: T, partial?: DeepPartial<T>): T {
  if (!partial) return base;
  const isObj = (v: any) => v && typeof v === 'object' && !Array.isArray(v);

  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };

  for (const key of Object.keys(partial as any)) {
    const v = (partial as any)[key];
    const cur = (out as any)[key];

    if (Array.isArray(v)) {
      // si llega array lo sobrescribimos (regla simple)
      (out as any)[key] = [...v];
    } else if (isObj(v) && isObj(cur)) {
      (out as any)[key] = deepMerge(cur, v as any);
    } else {
      (out as any)[key] = v;
    }
  }
  return out as T;
}
