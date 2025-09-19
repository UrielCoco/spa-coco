// src/services/assistant-inspector.ts
/* Utilidades para extraer JSON/“tool calls” desde el texto del assistant
   y convertirlos a un objeto parcial de tu ItineraryStore.
   - Soporta: upsert_itinerary({...}) / upsertItinerary({...})
   - Soporta: bloques ```json ... ``` o ```tool ... ```
   - Soporta: JSON “suelto” dentro del texto
*/

export type AnyRec = Record<string, any>;

export type InspectResult =
  | {
      kind: "none";
      raw: string;
      notes: string[];
    }
  | {
      kind: "itinerary-partial";
      raw: string;
      notes: string[];
      partial: AnyRec; // listo para pasar a tu store.upsertPartial(...)
      source: "tool-call" | "fenced-json" | "loose-json";
    }
  | {
      kind: "json";
      raw: string;
      notes: string[];
      json: AnyRec;
      source: "fenced-json" | "loose-json";
    };

const TOOL_CALL_RE =
  /\b(upsert_itinerary|upsertItinerary)\s*\(\s*({[\s\S]*?})\s*\)/i;

const FENCED_BLOCK_RE = /```(?:json|tool)?\s*([\s\S]*?)```/gi;

// Intenta parsear JSON robustamente
function safeParseJSON<T = AnyRec>(raw: string): { ok: true; value: T } | { ok: false; error: unknown } {
  try {
    const val = JSON.parse(raw);
    return { ok: true, value: val as T };
  } catch (e) {
    // A veces viene con comillas raras o trailing commas. Intento muy leve:
    try {
      const cleaned = raw
        .replace(/(\r?\n)[ \t]+$/gm, "$1")
        .replace(/,\s*(\}|\])/g, "$1"); // trailing commas
      const val = JSON.parse(cleaned);
      return { ok: true, value: val as T };
    } catch (e2) {
      return { ok: false, error: e2 };
    }
  }
}

function looksLikeItineraryShape(obj: AnyRec): boolean {
  if (!obj || typeof obj !== "object") return false;
  // Aceptamos varios envoltorios:
  // - { partial: {...} }
  // - { itinerary: {...} } (legacy)
  // - { meta/flights/days/... } directamente
  if ("partial" in obj && typeof obj.partial === "object") return true;
  if ("itinerary" in obj && typeof obj.itinerary === "object") return true;
  if ("meta" in obj || "days" in obj || "summary" in obj || "flights" in obj || "transports" in obj) return true;
  return false;
}

// Normaliza a un "partial" apto para tu store
function normalizeToPartial(obj: AnyRec): AnyRec {
  if ("partial" in obj && typeof obj.partial === "object") {
    return obj.partial;
  }
  if ("itinerary" in obj && typeof obj.itinerary === "object") {
    return obj.itinerary;
  }
  return obj; // ya parece la raíz del itinerario
}

function tryExtractToolCall(text: string) {
  const m = text.match(TOOL_CALL_RE);
  if (!m) return null;
  const argsRaw = m[2].trim();
  const parsed = safeParseJSON(argsRaw);
  if (!parsed.ok) return { ok: false as const, error: parsed.error, argsRaw };
  return { ok: true as const, args: parsed.value, argsRaw };
}

function* iterFencedJSON(text: string) {
  let m: RegExpExecArray | null;
  while ((m = FENCED_BLOCK_RE.exec(text))) {
    const body = (m[1] || "").trim();
    if (!body) continue;
    yield body;
  }
}

function tryExtractLooseJSON(text: string): string | null {
  // muy pragmático: buscamos el primer '{' y el último '}' y probamos
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

export function inspectAssistantText(rawAssistantText: string): InspectResult {
  const notes: string[] = [];

  // 1) Tool call
  const call = tryExtractToolCall(rawAssistantText);
  if (call && call.ok) {
    notes.push("Detectado tool-call: upsert_itinerary / upsertItinerary");
    const payload = call.args;
    if (looksLikeItineraryShape(payload)) {
      return {
        kind: "itinerary-partial",
        raw: rawAssistantText,
        notes,
        partial: normalizeToPartial(payload),
        source: "tool-call",
      };
    }
    // Si no luce itinerario, igual devolvemos JSON
    return {
      kind: "json",
      raw: rawAssistantText,
      notes: [...notes, "El tool-call no parece itinerario; se devuelve json crudo."],
      json: payload,
      source: "fenced-json",
    };
  } else if (call && !call.ok) {
    notes.push("Encontré un patrón de tool-call pero el JSON no parseó.");
  }

  // 2) Fenced ```json
  for (const block of iterFencedJSON(rawAssistantText)) {
    const parsed = safeParseJSON(block);
    if (parsed.ok) {
      const j = parsed.value;
      if (looksLikeItineraryShape(j)) {
        notes.push("Detectado bloque ```json``` con itinerario.");
        return {
          kind: "itinerary-partial",
          raw: rawAssistantText,
          notes,
          partial: normalizeToPartial(j),
          source: "fenced-json",
        };
      }
      notes.push("Detectado bloque ```json``` (no itinerario).");
      return {
        kind: "json",
        raw: rawAssistantText,
        notes,
        json: j,
        source: "fenced-json",
      };
    }
  }

  // 3) JSON suelto
  const loose = tryExtractLooseJSON(rawAssistantText);
  if (loose) {
    const parsed = safeParseJSON(loose);
    if (parsed.ok) {
      const j = parsed.value;
      if (looksLikeItineraryShape(j)) {
        notes.push("Detectado JSON suelto con itinerario.");
        return {
          kind: "itinerary-partial",
          raw: rawAssistantText,
          notes,
          partial: normalizeToPartial(j),
          source: "loose-json",
        };
      }
      notes.push("Detectado JSON suelto (no itinerario).");
      return {
        kind: "json",
        raw: rawAssistantText,
        notes,
        json: j,
        source: "loose-json",
      };
    } else {
      notes.push("Hubo un JSON suelto pero no parseó.");
    }
  }

  return { kind: "none", raw: rawAssistantText, notes };
}

// Helper opcional: log bonito para diagnosticar en consola
export function logInspect(prefix: string, r: InspectResult) {
  const title =
    r.kind === "itinerary-partial"
      ? `${prefix} ⇒ ITINERARY (from ${r.source})`
      : r.kind === "json"
      ? `${prefix} ⇒ JSON (from ${r.source})`
      : `${prefix} ⇒ (no structured json found)`;
  // eslint-disable-next-line no-console
  console.groupCollapsed(title);
  // eslint-disable-next-line no-console
  console.log("notes:", r.notes);
  if (r.kind === "itinerary-partial") {
    // eslint-disable-next-line no-console
    console.log("partial:", r.partial);
  } else if (r.kind === "json") {
    // eslint-disable-next-line no-console
    console.log("json:", r.json);
  }
  // eslint-disable-next-line no-console
  console.log("raw text:", r.raw);
  // eslint-disable-next-line no-console
  console.groupEnd();
}
