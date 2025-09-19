import { create } from "zustand";

export type ChatRole = "user" | "assistant" | "tool";
export type ChatMessage = { role: ChatRole; content: string; ts?: number };

type ChatState = {
  messages: ChatMessage[];
  add: (m: ChatMessage) => void;
  reset: () => void;
};

export const useChat = create<ChatState>((set) => ({
  messages: [],
  add: (m) => set((s) => ({ messages: [...s.messages, { ...m, ts: m.ts ?? Date.now() }] })),
  reset: () => set({ messages: [] }),
}));
