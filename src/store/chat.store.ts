import { create } from 'zustand';

export type ChatMsg = { role: 'user' | 'assistant'; content: string; hidden?: boolean };

type ChatState = {
  transcript: ChatMsg[]; // solo visibles
  events: ChatMsg[];     // aquí incluimos ocultos también
  addUser: (content: string) => void;
  addAssistantBlocks: (blocks: ChatMsg[], hidden?: ChatMsg[]) => void;
  clear: () => void;
};

export const useChatStore = create<ChatState>()((set) => ({
  transcript: [],
  events: [],
  addUser: (content) =>
    set((s) => ({
      transcript: [...s.transcript, { role: 'user', content }],
      events: [...s.events, { role: 'user', content }],
    })),
  addAssistantBlocks: (blocks, hidden) =>
    set((s) => ({
      transcript: [...s.transcript, ...blocks.map((b) => ({ ...b, hidden: false }))],
      events: [
        ...s.events,
        ...blocks.map((b) => ({ ...b, hidden: false })),
        ...(hidden ?? []).map((h) => ({ ...h, hidden: true })),
      ],
    })),
  clear: () => set({ transcript: [], events: [] }),
}));
