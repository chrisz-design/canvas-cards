---
name: project_status
description: Current status of the Nozey refactor to Bun + Next.js + Tauri
type: project
---

Refactor from Electron + vanilla HTML/JS to **Bun + Next.js 15 + Tauri v2** completed as of 2026-03-17.

**Completed:**
- All source files migrated: `src/app/`, `src/components/CanvasApp.tsx`, `src/lib/canvasEngine.ts`, `src/app/globals.css`
- Tauri v2 config: `src-tauri/tauri.conf.json`, `Cargo.toml`, `build.rs`, `src/main.rs`, `src/lib.rs`, `capabilities/default.json`
- Icons generated via `bunx tauri icon icon.svg`
- `index.html` and `main.js` (old Electron files) deleted

**Last known issue (2026-03-17):**
- Tauri build was failing due to missing `icons/icon.ico` — fixed by running `bunx tauri icon icon.svg`
- `package.metadata does not exist` warning — fixed by adding `[package.metadata.bundle]` to `Cargo.toml`
- Build was NOT fully verified to compile cleanly after those fixes

**How to apply**: Check if Rust/Cargo build still has errors before starting new feature work.
