---
name: project_architecture
description: File layout and key architectural decisions for canvas-cards (Nozey)
type: project
---

**Key files:**
- `src/lib/canvasEngine.ts` — all canvas logic (pan/zoom, cards, undo/redo, images, minimap, day/night, leaves). Has `/* eslint-disable */ // @ts-nocheck` at top. Exports `initCanvasEngine()` which returns a cleanup function.
- `src/components/CanvasApp.tsx` — `'use client'` component. Renders HTML skeleton with all required `id=` attributes. Calls `initCanvasEngine()` in `useEffect` with `useRef(false)` guard against StrictMode double-invoke.
- `src/app/globals.css` — all CSS (~880 lines). `@font-face` URL is `/WelcomeDarling.otf`.
- `src/app/layout.tsx` — root layout with Google Fonts CDN links for Caveat.
- `src-tauri/tauri.conf.json` — Tauri v2 config. `devUrl: "http://localhost:3000"`, `frontendDist: "../out"`, `beforeDevCommand: "bun run dev"`.
- `next.config.ts` — `output: 'export'`, `trailingSlash: true`, `images: { unoptimized: true }`.

**Drag region**: `#window-drag-bar` div has `data-tauri-drag-region` (Tauri v2 approach). No `-webkit-app-region: drag` CSS needed.

**Why imperative engine**: Undo stack holds live DOM refs, sticker system reparents DOM nodes across card boundaries, multiple 60fps rAF loops. Converting to React state would break all of this.

**How to apply**: When editing canvas features, work in `canvasEngine.ts`. When editing layout/structure, work in `CanvasApp.tsx`. Never introduce React state into the engine.
