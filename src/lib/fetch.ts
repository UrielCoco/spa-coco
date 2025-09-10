export async function safeFetch(input: RequestInfo, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {})
  const apiKey = import.meta.env.VITE_ASSISTANT_API_KEY
  if (apiKey) headers.set('Authorization', `Bearer ${apiKey}`)
  return fetch(input, { ...init, headers })
}
