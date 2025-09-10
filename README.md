# React Itinerary Chat — Vite + TS

SPA con **Chat (SSE)** y **Constructor de Itinerario**. Listo para correr y desplegar.

## Stack
- React 18 + TypeScript + Vite
- Tailwind CSS
- shadcn/ui (estilo) — componentes locales en `src/components/ui/*`
- lucide-react
- Estado global: Zustand
- Formularios: react-hook-form + zod
- i18n: i18next (ES/EN) con prioridad a `labels` provenientes del assistant
- Streaming SSE: `EventSource`
- Mapa: Leaflet (react-leaflet)
- Tests: Vitest + Testing Library
- ESLint + Prettier

## Requisitos
- Node 18+
- pnpm (recomendado)

## Setup

```bash
pnpm i
pnpm dev
```

Abrir: http://localhost:5173

## Variables de entorno
Crear `.env` basado en `.env.example`:

```
VITE_ASSISTANT_BASE_URL=/api/mock-chat
VITE_ASSISTANT_MODEL=gpt-4o-mini
# Opcional si tu endpoint lo requiere
# VITE_ASSISTANT_API_KEY=xxxxx
```

> Por defecto apunta al **mock**. Cambia `VITE_ASSISTANT_BASE_URL` a tu endpoint real cuando lo tengas.

## Mock SSE (dev)
El **mock** se sirve en desarrollo vía Vite en `/api/mock-chat` y emite:
- `event: token` con texto simulado (streaming)
- `event: tool` con JSON parcial que sigue el esquema `Itinerary`

Para probar tool-calls, escribe: **`/demo`** en el chat.

## Scripts

```bash
pnpm dev       # dev server
pnpm build     # build producción
pnpm preview   # servir build local
pnpm test      # tests (vitest + testing-library)
pnpm lint      # eslint
pnpm format    # prettier
```

## Despliegue

### Vercel
1. Importa el repo en Vercel.
2. Variables de entorno (Project Settings → Environment Variables):
   - `VITE_ASSISTANT_BASE_URL` = tu endpoint (p.ej. `https://my-hosted-chat.app/api/chat`)
   - `VITE_ASSISTANT_MODEL` = modelo
   - `VITE_ASSISTANT_API_KEY` = (opcional)
3. **Mock** solo existe en dev. En prod usa tu endpoint real.
4. Build & Output:
   - Build Command: `pnpm build`
   - Output Directory: `dist`

### Netlify
1. Nuevo sitio → Importar repositorio.
2. Build command: `pnpm build`
3. Publish directory: `dist`
4. Variables de entorno igual que arriba.

## Estructura

```
/ (raíz)
  ├─ README.md
  ├─ .env.example
  ├─ index.html
  ├─ vite.config.ts
  ├─ tsconfig.json
  ├─ package.json
  ├─ postcss.config.cjs
  ├─ tailwind.config.cjs
  ├─ .eslintrc.cjs
  ├─ .prettierrc
  ├─ public/
  │   ├─ favicon.svg
  │   ├─ logo.png
  │   └─ seed.json
  └─ src/
      ├─ main.tsx
      ├─ App.tsx
      ├─ lib/
      │   ├─ i18n.ts
      │   ├─ fetch.ts
      │   └─ sse.ts
      ├─ store/
      │   └─ itinerary.store.ts
      ├─ types/
      │   └─ itinerary.ts
      ├─ components/
      │   ├─ layout/ResizableSplit.tsx
      │   ├─ chat/ChatPanel.tsx
      │   ├─ chat/MessageBubble.tsx
      │   ├─ itinerary/ItineraryPanel.tsx
      │   ├─ itinerary/SummaryCard.tsx
      │   ├─ itinerary/FlightsCard.tsx
      │   ├─ itinerary/DayPlanCard.tsx
      │   ├─ itinerary/TransportCard.tsx
      │   ├─ itinerary/ExtrasCard.tsx
      │   ├─ itinerary/MapSection.tsx
      │   ├─ itinerary/ExportBar.tsx
      │   └─ common/{Button,Badge,Tag,EmptyState}.tsx
      ├─ components/ui/*  # Subconjunto estilo shadcn
      ├─ pages/
      │   └─ Home.tsx
      ├─ hooks/
      │   ├─ useAssistantStream.ts
      │   └─ useAutosave.ts
      ├─ services/
      │   ├─ assistant.ts
      │   └─ parsers.ts
      ├─ locales/
      │   ├─ en/common.json
      │   ├─ en/itinerary.json
      │   ├─ es/common.json
      │   └─ es/itinerary.json
      ├─ styles/
      │   └─ globals.css
      └─ tests/
          └─ smoke.test.tsx
```

## Exportar JSON / PDF
- **Guardar JSON** descarga un archivo con el itinerario actual.
- **Cargar JSON** permite importar un archivo (ej. `public/seed.json`).
- **Exportar PDF** usa `window.print()` y CSS `@media print` para formato limpio.

## Notas
- Los componentes ui en `src/components/ui` replican el estilo shadcn/ui con Tailwind, sin dependencias externas adicionales a Radix. (No es necesario ejecutar el CLI de shadcn).
- Si tu assistant envía `labels` en el evento `tool`, la UI usará esas etiquetas con prioridad sobre i18n.
