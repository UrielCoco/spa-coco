// src/hooks/useSpaChat.ts
// @ts-nocheck
import { useCallback, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "@/services/spa";
import { streamSpaChat } from "@/services/spa";

// ⚠️ No obligamos a que el store exista. Si no, es no-op.
let safeStore: any = null;
try {
  // Si tu store existe (p.ej. zustand), no romperá tipado aunque falten métodos.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("@/store/itinerary.store");
  safeStore = mod?.useItineraryStore?.getState?.() || null;
} catch {
  // no-op
}

export type Bubble =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; content: string; thinking?: boolean; error?: string };

function guid() {
  return Math.random().toString(36).slice(2, 10);
}

function tryApplyItineraryJSON(obj: any) {
  if (!obj || typeof obj !== "object") return;

  const hasMeta = obj?.meta && typeof obj.meta === "object";

  // Si tu store tiene alguno de estos métodos los usamos; si no, no pasa nada
  if (safeStore?.upsertItinerary && hasMeta) {
    try {
      safeStore.upsertItinerary(obj);
    } catch {}
  } else if (safeStore?.upsertPartial && hasMeta) {
    try {
      safeStore.upsertPartial(obj);
    } catch {}
  } else if (safeStore?.loadFromJSON && hasMeta) {
    try {
      safeStore.loadFromJSON(obj);
    } catch {}
  }
}

export function useSpaChat(init?: { system?: string }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [busy, setBusy] = useState(false);

  // Acumuladores de tool call
  const toolBuf = useRef<{ name?: string; args: string }>({ name: undefined, args: "" });

  const messages = useMemo<ChatMessage[]>(
    () =>
      bubbles.map((b) => ({
        role: b.role,
        content: b.content,
      })),
    [bubbles],
  );

  const send = useCallback(
    async (text: string) => {
      if (!text?.trim()) return;
      const userId = guid();
      setBubbles((prev) => [...prev, { id: userId, role: "user", content: text }]);

      // Burbuja “pensando…”
      const asstId = guid();
      setBubbles((prev) => [...prev, { id: asstId, role: "assistant", content: "", thinking: true }]);
      setBusy(true);

      try {
        let acc = "";

        for await (const ev of streamSpaChat({
          system: init?.system,
          messages: [...messages, { role: "user", content: text }],
        })) {
          if (ev.type === "assistant_text_delta") {
            acc += ev.text || "";
            setBubbles((prev) =>
              prev.map((b) => (b.id === asstId ? { ...b, content: acc, thinking: true } : b)),
            );
          }
          if (ev.type === "assistant_text_done") {
            acc = ev.text || acc;
            setBubbles((prev) =>
              prev.map((b) => (b.id === asstId ? { ...b, content: acc, thinking: false } : b)),
            );
          }
          if (ev.type === "assistant_message") {
            // Algunos modelos emiten "message" con partes; si trae texto lo añadimos
            const parts = ev.message?.content?.map?.((p: any) => p?.text?.value).filter(Boolean) || [];
            if (parts.length) {
              const appended = parts.join("\n");
              acc = (acc ? acc + "\n" : "") + appended;
              setBubbles((prev) =>
                prev.map((b) => (b.id === asstId ? { ...b, content: acc, thinking: false } : b)),
              );
            }
          }
          if (ev.type === "tool_call_delta") {
            // Acumulamos args de la tool (p.ej. upsert_itinerary)
            toolBuf.current.name = ev.name;
            toolBuf.current.args += ev.argsDelta || "";
          }
          if (ev.type === "tool_call_done") {
            // Intentamos parsear argumentos completos
            const name = ev.name || toolBuf.current.name || "tool";
            let args = ev.args;
            if (!args && toolBuf.current.args) {
              try {
                args = JSON.parse(toolBuf.current.args);
              } catch {
                args = { _raw: toolBuf.current.args };
              }
            }
            // Reset buffer
            toolBuf.current = { name: undefined, args: "" };

            // Si es nuestra función de itinerario, aplicamos al store
            if (name === "upsert_itinerary" && args?.partial) {
              tryApplyItineraryJSON(args.partial);
            }
          }
          if (ev.type === "raw") {
            // (opcional) Si el assistant pegó JSON directo en texto, intentamos detectarlo
            // y aplicarlo al store (solo si parece itinerario).
            const j = ev?.event;
            // nada adicional aquí; lo hacemos al final si el texto es JSON.
          }
          if (ev.type === "error") {
            setBubbles((prev) =>
              prev.map((b) =>
                b.id === asstId ? { ...b, thinking: false, error: ev.error?.message || "Error" } : b,
              ),
            );
          }
          if (ev.type === "done") {
            // Al finalizar, si la última respuesta es JSON puro con "meta", aplícalo:
            try {
              const last = acc.trim();
              if (last.startsWith("{") && last.endsWith("}")) {
                const obj = JSON.parse(last);
                if (obj?.meta) {
                  tryApplyItineraryJSON(obj);
                }
              }
            } catch {}
            setBusy(false);
          }
        }
      } catch (err: any) {
        setBubbles((prev) =>
          prev.map((b) =>
            b.role === "assistant" && b.thinking ? { ...b, thinking: false, error: err?.message || "Error" } : b,
          ),
        );
        setBusy(false);
      }
    },
    [messages, init?.system],
  );

  return { bubbles, busy, send };
}
