// src/hooks/useAssistantStream.ts
/* eslint-disable no-console */
import { useRef } from "react";

// ✔️ Tap para la tercera columna (historial completo)
let addAssistantEvent:
  | ((e: { kind: string; data: any; runId?: string; threadId?: string }) => void)
  | undefined;
try {
  // @ts-ignore – carga perezosa si existe
  const dbg = require("@/store/assistantDebug.store");
  if (dbg?.useAssistantDebug?.getState) {
    addAssistantEvent = dbg.useAssistantDebug.getState().addEvent;
  }
} catch {
  // opcional
}

// ✔️ Tap opcional que ya usabas para ver último tool payload (raw/parsed)
let setLastToolRaw: ((s: string) => void) | undefined;
let setLastToolParsed: ((v: any) => void) | undefined;
try {
  // @ts-ignore – cargamos perezosamente si existe
  const mod = require("@/store/toolDebug.store");
  if (mod?.useToolDebug?.getState) {
    const st = mod.useToolDebug.getState();
    setLastToolRaw = st.setLastToolRaw;
    setLastToolParsed = st.setLastToolParsed;
  }
} catch {
  // el visor es opcional
}

type Role = "user" | "assistant" | "system";
export type Message = { role: Role; content: string };

type StartPayload = {
  messages: Message[];
};

type Callbacks = {
  /** Llamado cuando llega texto token a token */
  onDelta?: (chunk: string) => void;
  /** Llamado cuando el server envía done (con el texto final si lo hubo) */
  onDone?: (finalText: string) => void;
  /** Si quieres que el hook cree una burbuja placeholder antes de streamear texto */
  ensureAssistantPlaceholder?: () => void;
  /** Si quieres que el hook agregue texto a la última burbuja */
  appendAssistantText?: (chunk: string) => void;
  /** Si quieres cerrar/ajustar la última burbuja al terminar */
  finalizeAssistantMessage?: (finalText: string) => void;
  /** Llega cada “pedacito” de argumentos de tool */
  onToolDelta?: (toolId: string, name: string | undefined, delta: string) => void;
  /** Llega cuando la tool terminó con el JSON completo ya parseado (si se pudo) */
  onToolCompleted?: (toolId: string, name: string | undefined, rawArgs: string, parsed: any | null) => void;
  /** Logs extra del servidor */
  onDebug?: (payload: any) => void;
  /** Error de red o del stream */
  onError?: (err: unknown) => void;
};

type SSEEvent = {
  event: string; // "delta" | "tool_call.arguments.delta" | ...
  data: any;
};

function parseEventLines(buf: string): SSEEvent[] {
  const events: SSEEvent[] = [];
  const parts = buf.split("\n\n");
  for (const part of parts) {
    if (!part.trim()) continue;
    let event = "message";
    let dataLine = "";
    for (const line of part.split("\n")) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLine += line.slice(5).trim();
      }
    }
    if (!dataLine) continue;
    try {
      const data = JSON.parse(dataLine);
      events.push({ event, data });
    } catch (e) {
      console.warn("[useAssistantStream] JSON.parse error:", e, dataLine);
    }
  }
  return events;
}

function tap(kind: string, data: any, runId?: string, threadId?: string) {
  try {
    addAssistantEvent?.({ kind: kind as any, data, runId, threadId });
  } catch {}
}

export function useAssistantStream() {
  const readingRef = useRef(false);

  async function start(
    payload: StartPayload,
    cb: Callbacks = {}
  ): Promise<void> {
    if (readingRef.current) {
      console.warn("[useAssistantStream] stream ya activo; se iniciará otro de todos modos.");
    }

    const lastText = payload.messages.at(-1)?.content ?? "(sin texto)";
    console.log("[useAssistantStream] SEND » user:", lastText);
    tap("response.start", { message: lastText });

    const res = await fetch("/api/spa-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok || !res.body) {
      const msg = `Stream HTTP error ${res.status}`;
      console.error("[useAssistantStream] ERROR:", msg);
      cb.onError?.(msg);
      tap("error", { message: msg });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    readingRef.current = true;

    // buffers por toolId
    const toolBuffers: Record<string, { name?: string; args: string }> = {};

    // flags para UI
    let createdPlaceholder = false;
    let receivedAnyText = false;

    const ensurePlaceholder = () => {
      if (createdPlaceholder) return;
      createdPlaceholder = true;
      console.log("[useAssistantStream] ensurePlaceholder → creando burbuja assistant vacía");
      cb.ensureAssistantPlaceholder?.();
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Procesa cualquier evento completo en el buffer
        const lastDoubleBreak = buffer.lastIndexOf("\n\n");
        if (lastDoubleBreak === -1) continue;

        const chunk = buffer.slice(0, lastDoubleBreak + 2);
        buffer = buffer.slice(lastDoubleBreak + 2);

        const evts = parseEventLines(chunk);
        for (const { event, data } of evts) {
          // Logs uniformes
          console.log("[SSE evt]", event, data);

          // Tap para la columna de debug (normalizamos un poco)
          const mappedKind =
            event === "delta"
              ? "response.delta"
              : event === "done"
              ? "response.completed"
              : event.startsWith("tool_call.")
              ? (event === "tool_call.completed" ? "tool_result" : "tool_call")
              : event;

          tap(mappedKind, { ...data, _event: event });

          switch (event) {
            case "meta": {
              // opcional
              break;
            }

            case "delta": {
              const val = String(data?.value ?? "");
              if (!val) break;
              receivedAnyText = true;
              cb.onDelta?.(val);
              ensurePlaceholder();
              cb.appendAssistantText?.(val);
              break;
            }

            // 🔧 Tool args (normalizado por el server)
            case "tool_call.arguments.delta": {
              const id: string = data?.id ?? "unknown";
              const name: string | undefined = data?.name;
              const d: string = String(data?.arguments?.delta ?? "");
              const b = (toolBuffers[id] ||= { name, args: "" });
              if (name && !b.name) b.name = name;
              b.args += d;
              cb.onToolDelta?.(id, b.name, d);
              break;
            }

            case "tool_call.completed": {
              const id: string = data?.id ?? "unknown";
              const name: string | undefined = data?.name;
              let rawArgs: string =
                typeof data?.arguments === "string" ? data.arguments : "";

              // Si veníamos acumulando deltas, preferimos el buffer
              const b = (toolBuffers[id] ||= { name, args: "" });
              if (b.args && b.args.length > 0) rawArgs = b.args;

              if (setLastToolRaw) setLastToolRaw(rawArgs);

              let parsed: any = null;
              try {
                parsed = rawArgs ? JSON.parse(rawArgs) : null;
                if (setLastToolParsed) setLastToolParsed(parsed);
              } catch (e) {
                console.warn("[useAssistantStream] tool args no son JSON válido:", e);
              }

              // Merge con la UI si viene partial
              try {
                if (parsed?.partial) {
                  const CV = (window as any).CV;
                  if (CV?.mergeItinerary) {
                    CV.mergeItinerary(parsed);
                  }
                }
              } catch (e) {
                console.error("[useAssistantStream] mergeItinerary error:", e);
              }

              cb.onToolCompleted?.(id, name, rawArgs, parsed);
              break;
            }

            case "done": {
              const finalText = String(data?.text ?? "");
              cb.onDone?.(finalText);
              if (finalText) {
                ensurePlaceholder();
                cb.appendAssistantText?.(""); // no-op por si quieres cerrar estilos
                cb.finalizeAssistantMessage?.(finalText);
              }
              break;
            }

            case "error": {
              console.error("[useAssistantStream] stream error:", data);
              cb.onError?.(data);
              break;
            }

            case "debug": {
              console.log("[useAssistantStream] mapped type: unknown");
              console.log("[stream unknown evt] debug", data);
              cb.onDebug?.(data);
              break;
            }

            default: {
              // fallback: algunos navegadores entregan como "message"
              try {
                if (data?.value) {
                  const val = String(data.value);
                  receivedAnyText = true;
                  cb.onDelta?.(val);
                  ensurePlaceholder();
                  cb.appendAssistantText?.(val);
                } else {
                  cb.onDebug?.({ event, data });
                }
              } catch (e) {
                cb.onDebug?.({ event, data, error: String(e) });
              }
              break;
            }
          }
        }
      }
    } catch (err) {
      console.error("[useAssistantStream] read error:", err);
      cb.onError?.(err);
      tap("error", { message: String(err) });
    } finally {
      readingRef.current = false;

      // Si no recibimos nada de texto, avisa por si quieres hacer algo en la UI
      if (!receivedAnyText) {
        cb.onDone?.("");
      }
    }
  }

  return { start };
}
