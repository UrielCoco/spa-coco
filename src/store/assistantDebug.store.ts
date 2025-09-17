// src/store/assistantDebug.store.ts
import { create } from 'zustand'

export type AssistantEventKind =
  | 'response.start'
  | 'response.delta'
  | 'response.output_text.delta'
  | 'response.output_text.done'
  | 'response.output_item.added'
  | 'response.completed'
  | 'message.created'
  | 'message.delta'
  | 'message.completed'
  | 'tool_call'
  | 'tool_result'
  | 'error'
  | 'debug'

export interface AssistantEventEntry {
  id: string
  t: number
  kind: AssistantEventKind
  data: any
  runId?: string
  threadId?: string
}

interface AssistantDebugState {
  events: AssistantEventEntry[]
  addEvent: (e: Omit<AssistantEventEntry, 'id' | 't'>) => void
  clear: () => void
}

export const useAssistantDebug = create<AssistantDebugState>((set) => ({
  events: [],
  addEvent: (e) =>
    set((s) => ({
      events: [
        {
          id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
          t: Date.now(),
          ...e,
        },
        ...s.events,
      ].slice(0, 2000),
    })),
  clear: () => set({ events: [] }),
}))
