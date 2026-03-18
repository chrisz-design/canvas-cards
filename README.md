# Nozey

**The cozy virtual scrapbook** — a frameless desktop app for arranging cards, notes, and images on an infinite canvas.

## Stack

| Layer | Tech |
|-------|------|
| Desktop shell | Tauri v2 (Rust) |
| Frontend framework | Next.js 15 (App Router, static export) |
| Package manager | Bun |
| Language | TypeScript + React 19 |
| Canvas engine | Imperative DOM (vanilla JS, `src/lib/canvasEngine.ts`) |

## Project structure

```
canvas-cards/
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout (Google Fonts CDN, metadata)
│   │   ├── page.tsx          # Renders <CanvasApp />
│   │   └── globals.css       # All app styles (~880 lines)
│   ├── components/
│   │   └── CanvasApp.tsx     # 'use client' shell — mounts engine, renders HTML skeleton
│   └── lib/
│       └── canvasEngine.ts   # ~4000-line imperative canvas engine (ported from index.html)
├── src-tauri/
│   ├── src/
│   │   ├── main.rs           # Windows subsystem entry point
│   │   └── lib.rs            # Tauri builder
│   ├── capabilities/
│   │   └── default.json      # Tauri v2 permissions
│   ├── icons/                # App icons (generated via `bunx tauri icon icon.svg`)
│   ├── Cargo.toml
│   ├── build.rs
│   └── tauri.conf.json       # Window config (1280×800, frameless, titleBarStyle: Overlay)
├── public/
│   └── WelcomeDarling.otf    # Custom font
├── next.config.ts            # output: 'export', trailingSlash: true
├── tsconfig.json
└── package.json
```

## Development

```bash
# Install dependencies
bun install

# Next.js dev server only (http://localhost:3000)
bun run dev

# Full Tauri dev window (runs Next.js dev server + Tauri)
bun run tauri

# Production build
bun run tauri:build
```

> Requires [Rust + Cargo](https://rustup.rs/) and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your platform.

## Architecture notes

### Canvas engine
`canvasEngine.ts` is the entire interactive canvas logic — pan/zoom, card drag, undo/redo, image sticking, minimap, day/night cycle, falling leaves, etc. It is kept as **imperative DOM code** rather than converted to React state because:

- The undo stack holds live DOM element references
- The sticker system reparents DOM nodes across card boundaries
- Multiple 60fps `requestAnimationFrame` loops are tightly coupled

`CanvasApp.tsx` renders the required HTML skeleton (all `id=` attributes intact), then calls `initCanvasEngine()` from a `useEffect` with a `useRef` guard to prevent double-initialisation in React StrictMode.

### Tauri window
The window uses `decorations: false` + `titleBarStyle: "Overlay"` for a frameless look. The `#window-drag-bar` div at the top carries `data-tauri-drag-region` to enable window dragging.

### Static export
Next.js is configured with `output: 'export'` so Tauri can load the built HTML from `../out` over the `file://` protocol. `trailingSlash: true` ensures asset paths resolve correctly.

## Icon generation

```bash
bunx tauri icon icon.svg
```

This regenerates all platform icons in `src-tauri/icons/` from the source SVG.
