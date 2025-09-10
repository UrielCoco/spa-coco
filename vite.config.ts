// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Opcional: si quieres proxy en dev, exporta VITE_DEV_PROXY_TARGET al correr `pnpm dev`
// y usa VITE_ASSISTANT_BASE_URL=/api/chat en tu .env
const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: devProxyTarget
      ? {
          '/api/chat': {
            target: devProxyTarget, // ej. http://localhost:3000
            changeOrigin: true,
            ws: true,
          },
        }
      : undefined,
  },
})
