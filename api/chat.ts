// /api/chat.ts — Vercel Edge Function (proxy SSE a tu backend de chat)
// Evita CORS y deja pasar el streaming de eventos limpio
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

    // Reenviar solo headers seguros (sin custom que rompan preflight)
    const fwdHeaders: Record<string, string> = {
      Accept: "text/event-stream", // 👈 ayuda a algunos upstreams
    }
    const ct = req.headers.get("content-type")
    if (ct) fwdHeaders["Content-Type"] = ct
    const auth = req.headers.get("authorization")
    if (auth) fwdHeaders["Authorization"] = auth

    // Passthrough del cuerpo (Edge soporta Web Streams)
    const upstreamRes = await fetch(UPSTREAM, {
      method: "POST",
      headers: fwdHeaders,
      body: req.body,
      // evitar caches intermedias con SSE
      cache: "no-store",
      // keepalive no aplica en edge, pero cache no-store sí
    })

    // Si el upstream falla, devolvemos el cuerpo para poder ver el error en consola
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

    // Copia de headers + CORS
    const out = new Headers(upstreamRes.headers)
    out.set("Access-Control-Allow-Origin", origin)
    out.set("Access-Control-Allow-Credentials", "true")
    // Asegurar SSE si el upstream no lo marcó
    if (!out.get("content-type")) {
      out.set("Content-Type", "text/event-stream; charset=utf-8")
    }
    out.delete("content-length") // streaming chunked

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: out,
    })
  } catch (err: any) {
    // Error en la función edge (red, DNS, etc.)
    const msg =
      typeof err === "object" && err && "message" in err ? err.message : String(err)
    return new Response(`EDGE_502 ${msg}`, {
      status: 502,
      headers: { ...cors(origin), "Content-Type": "text/plain; charset=utf-8" },
    })
  }
}
