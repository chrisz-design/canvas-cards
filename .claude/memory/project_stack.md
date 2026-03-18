---
name: project_stack
description: Tech stack and architecture of the Nozey canvas-cards project
type: project
---

Nozey is a frameless desktop scrapbook app built with **Bun + Next.js 15 + Tauri v2**.

- **Frontend**: Next.js 15 App Router, `output: 'export'` (static), React 19, TypeScript
- **Desktop shell**: Tauri v2 (Rust), window 1280×800, `decorations: false`, `titleBarStyle: "Overlay"`
- **Package manager**: Bun (`bun install`, `bun run dev`, `bun run tauri`)
- **Canvas engine**: ~4000-line imperative DOM JS in `src/lib/canvasEngine.ts`, called from a `useEffect` in `src/components/CanvasApp.tsx`
- **Fonts**: `WelcomeDarling.otf` in `public/`, Caveat loaded via Google Fonts CDN in `layout.tsx`
- **Icons**: generated with `bunx tauri icon icon.svg` → `src-tauri/icons/`

**Why**: Refactored from Electron + vanilla HTML/JS to Tauri + Next.js.

**How to apply**: Always use Bun (not npm/npx). When suggesting commands use `bun run`. Understand that the canvas engine is intentionally imperative — do not suggest converting it to React state.
