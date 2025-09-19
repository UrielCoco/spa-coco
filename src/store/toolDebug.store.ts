// src/store/toolDebug.store.ts
import { create } from 'zustand'

type ToolDebugState = {
  streaming: boolean
  lastFunctionName?: string
  lastToolRaw: string
  lastToolParsed: any
  start: (fnName: string) => void
  appendRaw: (chunk: string) => void
  setParsed: (obj: any) => void
  end: () => void
  clear: () => void
}

export const useToolDebug = create<ToolDebugState>((set) => ({
  streaming: false,
  lastFunctionName: undefined,
  lastToolRaw: '',
  lastToolParsed: undefined,

  start: (fnName) => set(() => ({ streaming: true, lastFunctionName: fnName })),
  appendRaw: (chunk) =>
    set((s) => ({ lastToolRaw: (s.lastToolRaw || '') + (chunk ?? '') })),
  setParsed: (obj) => set(() => ({ lastToolParsed: obj })),
  end: () => set(() => ({ streaming: false })),
  clear: () =>
    set(() => ({
      streaming: false,
      lastFunctionName: undefined,
      lastToolRaw: '',
      lastToolParsed: undefined,
    })),
}))
