export type SSEHandlers = {
  onToken?: (t: string) => void
  onTool?: (json: any) => void
  onError?: (e: any) => void
  onDone?: () => void
}

export function connectSSE(url: string, body: any, handlers: SSEHandlers) {
  const es = new EventSource(url)
  // Note: For POST SSE some servers use fetch+ReadableStream; our mock uses GET style.
  // If your endpoint requires POST, proxy that server-side.
  es.addEventListener('token', (e: MessageEvent) => handlers.onToken?.(e.data))
  es.addEventListener('tool', (e: MessageEvent) => {
    try { handlers.onTool?.(JSON.parse(e.data)) } catch { /* ignore */ }
  })
  es.onerror = (e) => { handlers.onError?.(e); es.close() }
  es.onopen = () => { /* connected */ }
  return es
}
