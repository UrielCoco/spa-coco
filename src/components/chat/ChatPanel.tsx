import React, { useMemo, useRef, useState } from "react";
import { useAssistantStream, type Message as StreamMsg } from "@/hooks/useAssistantStream";
import { useItineraryStore } from "@/store/itinerary.store";
import { inspectAssistantText } from "@/services/assistant-inspector";
import MessageBubble from "./MessageBubble";

type Bubble = { id: string; role: "user" | "assistant"; content: string };

function uid() {
  return Math.random().toString(36).slice(2);
}

/**
 * ChatPanel
 * - Muestra SOLO respuestas del assistant por default (toggle arriba)
 * - Streamea con useAssistantStream (placeholder + deltas)
 * - Junta tool_call.arguments.delta por id y aplica upsert en tool_call.completed
 * - Al finalizar el mensaje, también inspecciona bloques ```json/```tool
 */
export default function ChatPanel() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [onlyAssistant, setOnlyAssistant] = useState(true);

  const { start } = useAssistantStream();
  const applyPartial = useItineraryStore((s) => s.applyPartial);

  const messagesRef = useRef<StreamMsg[]>([]);
  const lastAssistantIndexRef = useRef<number | null>(null);

  const viewBubbles = useMemo(
    () => (onlyAssistant ? bubbles.filter((b) => b.role === "assistant") : bubbles),
    [bubbles, onlyAssistant]
  );

  const send = async () => {
    const text = input.trim();
    if (!text) return;

    const userBubble: Bubble = { id: uid(), role: "user", content: text };
    setBubbles((bs) => [...bs, userBubble]);
    messagesRef.current.push({ role: "user", content: text });
    setInput("");

    // buffer por tool_call id (para agrupar los deltas de argumentos)
    const toolBuf: Record<string, { name?: string; args: string }> = {};

    await start(
      { messages: messagesRef.current },
      {
        // pinta un globo placeholder para el assistant
        ensureAssistantPlaceholder: () => {
          if (lastAssistantIndexRef.current == null) {
            const b: Bubble = { id: uid(), role: "assistant", content: "" };
            setBubbles((bs) => {
              lastAssistantIndexRef.current = bs.length;
              return [...bs, b];
            });
          }
        },

        // acumula texto del assistant
        appendAssistantText: (chunk: string) => {
          if (lastAssistantIndexRef.current == null) return;
          setBubbles((bs) => {
            const i = lastAssistantIndexRef.current as number;
            const copy = bs.slice();
            copy[i] = { ...copy[i], content: (copy[i].content || "") + chunk };
            return copy;
          });
        },

        // deltas de argumentos de tools (streaming)
        onToolDelta: (id: string, name: string | undefined, delta: string) => {
          const b = (toolBuf[id] ||= { name, args: "" });
          if (name && !b.name) b.name = name;
          b.args += delta || "";
        },

        // cierre de la tool: ya tenemos los args completos
        onToolCompleted: (
          id: string,
          name: string | undefined,
          rawArgs: string,
          parsed: any
        ) => {
          const buf = toolBuf[id];
          const toolName = (name || buf?.name || "").toLowerCase().replace(/[^a-z]/g, "");
          const argsString = buf?.args || rawArgs || "";

          if (
            toolName.includes("upsertitinerary") ||
            toolName.includes("upsertitinerario") ||
            toolName.includes("upsertitinerario") // por si acaso
          ) {
            try {
              // Si parsed viene null, intentamos parsear argsString
              const payload = parsed ?? (argsString ? JSON.parse(argsString) : null);
              if (payload) {
                // Reusamos el inspector: envolvemos como bloque json estándar
                const inspected = inspectAssistantText("```json\n" + JSON.stringify(payload) + "\n```");
                if (inspected.kind === "itinerary-partial") {
                  applyPartial(inspected.partial as any);
                }
              }
            } catch {
              // si no parsea, lo ignoramos silenciosamente
            }
          }
        },

        // cuando termina el texto final del assistant
        finalizeAssistantMessage: (finalText: string) => {
          messagesRef.current.push({ role: "assistant", content: finalText });

          // última pasada: si vino un bloque ```json con partial, lo aplicamos
          const inspected = inspectAssistantText(finalText);
          if (inspected.kind === "itinerary-partial") {
            applyPartial(inspected.partial as any);
          }
        },

        onDone: () => {
          lastAssistantIndexRef.current = null;
        },

        onError: () => {
          lastAssistantIndexRef.current = null;
        },

        // opcional: puedes mirar datos raros aquí si quieres
        onDebug: (_d: unknown) => {
          // console.debug('[ChatPanel:onDebug]', _d)
        },
      }
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Controles */}
      <div className="flex items-center justify-between gap-2 p-2 border-b bg-background">
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={onlyAssistant}
            onChange={(e) => setOnlyAssistant(e.target.checked)}
          />
          Mostrar solo respuestas del assistant
        </label>
      </div>

      {/* Burbujas */}
      <div className="flex-1 min-h-0 overflow-auto p-3 space-y-2">
        {viewBubbles.map((b) => (
          <MessageBubble key={b.id} role={b.role} content={b.content} />
        ))}
      </div>

      {/* Input */}
      <div className="p-2 border-t bg-background">
        <div className="flex items-center gap-2">
          <input
            className="flex-1 border rounded px-3 py-2 text-sm"
            placeholder="Escribe tu mensaje…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button
            onClick={send}
            className="px-3 py-2 text-sm rounded border hover:bg-neutral-50"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
