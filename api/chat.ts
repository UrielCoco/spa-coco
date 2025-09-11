// /api/chat.ts — Vercel Edge Function (proxy SSE + normalizador de payload)
// Evita CORS y convierte {messages: [...] } => {message:{ role, parts:[{type:'text',text}] }, stream:true}
export const config = { runtime: "edge" }

const UPSTREAM =
  process.env.CHAT_UPSTREAM || "https://coco-volare-ai-chat.vercel.app/api/chat"

function cors(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  }
}

type InMsg = { role: "user" | "assistant" | "system"; content: string }
type IncomingBody =
  | { messages?: InMsg[]; model?: string; stream?: boolean; [k: string]: any }
  | { message?: any; model?: string; stream?: boolean; [k: string]: any }
  | { text?: string; model?: string; stream?: boolean; [k: string]: any }

function normalizePayload(body: IncomingBody) {
  // Si YA viene en el formato del upstream, lo respetamos
  if (body && (body as any).message?.parts) {
    return {
      ...body,
      stream: true,
    }
  }

  // { text: "..." }
  if (typeof (body as any)?.text === "string") {
    return {
      message: {
        role: "user",
        parts: [{ type: "text", text: (body as any).text }],
      },
      stream: true,
      ...(body?.model ? { model: body.model } : {}),
    }
  }

  // { messages: [...] } => tomar ÚLTIMO mensaje de usuario
  if (Array.isArray((body as any)?.messages)) {
    const msgs = (body as any).messages as InMsg[]
    const lastUser =
      [...msgs].reverse().find((m) => m.role === "user") || msgs[msgs.length - 1]
    const text = lastUser?.content || ""
    return {
      message: {
        role: "user",
        parts: [{ type: "text", text }],
      },
      stream: true,
      ...(body?.model ? { model: body.model } : {}),
    }
  }

  // fallback vacío
  return {
    message: { role: "user", parts: [{ type: "text", text: "" }] },
    stream: true,
  }
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get("origin") ?? "*"

  try {
    // Preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin) })
    }

    if (req.method !== "POST") {
      return new Response("Use POST", {
        status: 405,
        headers: cors(origin),
      })
    }

    // Leemos el JSON una sola vez y normalizamos al contrato del upstream
    let incoming: IncomingBody
    try {
      incoming = await req.json()
    } catch {
      return new Response("Bad JSON", {
        status: 400,
        headers: { ...cors(origin), "Content-Type": "text/plain; charset=utf-8" },
      })
    }

    const upstreamBody = JSON.stringify(normalizePayload(incoming))

    // Reenviamos headers seguros (sin custom que rompan preflight)
    const fwdHeaders: Record<string, string> = {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
    }
    const auth = req.headers.get("authorization")
    if (auth) fwdHeaders["Authorization"] = auth

    const upstreamRes = await fetch(UPSTREAM, {
      method: "POST",
      headers: fwdHeaders,
      body: upstreamBody,
      cache: "no-store",
    })

    // Si el upstream falla, devolvemos su cuerpo para diagnosticar
    if (!upstreamRes.ok) {
      const text = await upstreamRes.text().catch(() => "")
      return new Response(text || `UPSTREAM_${upstreamRes.status}`, {
        status: upstreamRes.status,
        headers: {
          ...cors(origin),
          "Content-Type":
            upstreamRes.headers.get("content-type") ||
            "text/plain; charset=utf-8",
        },
      })
    }

    // Stream passthrough + CORS
    const out = new Headers(upstreamRes.headers)
    out.set("Access-Control-Allow-Origin", origin)
    out.set("Access-Control-Allow-Credentials", "true")
    if (!out.get("content-type")) {
      out.set("Content-Type", "text/event-stream; charset=utf-8")
    }
    out.delete("content-length")

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: out,
    })
  } catch (err: any) {
    const msg = err?.message || String(err)
    return new Response(`EDGE_502 ${msg}`, {
      status: 502,
      headers: { ...cors(origin), "Content-Type": "text/plain; charset=utf-8" },
    })
  }
}
