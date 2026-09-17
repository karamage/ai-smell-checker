---
name: verify
description: Build, launch and drive MOKUMOKU (pixel co-working app) to verify client/worker changes end-to-end.
---

# Verify MOKUMOKU

## Launch

```bash
bun run dev   # vite build + wrangler dev
```

- Serves the **built** `dist/client` — after editing client code, rerun `bun run build`; wrangler dev picks up new dist files without a restart.
- Port: 8787, but falls back (e.g. 8788) if taken — read the "Ready on http://localhost:PORT" line from output.
- The AI binding warning about remote resources is normal.

## Drive

- Python Playwright is not installed; use **Node Playwright** (`npm i playwright@<npx playwright --version>` in the scratchpad; Chromium builds are already cached in `~/Library/Caches/ms-playwright`).
- Join flow: `goto http://localhost:PORT/?room=<unique-room>`, `fill('#name', …)`, `click('.join-button')`. Use a fresh room name per run to avoid stale state from earlier sessions.
- Multiple players: open more pages in the same context and join the same room. Call `page.bringToFront()` on the observed page before screenshotting so rAF isn't throttled.
- Canvas fx are time-limited (welcome fx ~3.6s, emotes ~2.2s) — screenshot within that window right after triggering.
- WebSocket endpoint (for programmatic players): `ws://localhost:PORT/ws/<room>`, send `{type:"join",name,palette}` JSON.

## Gotchas

- The DOM HUD bar overlays the top of the canvas; screen-space canvas fx should stay below ~55 CSS px.
- `bun run check` currently fails on pre-existing format errors in ChatPanel.tsx / JoinScreen.tsx — unrelated to most changes; use `bun run typecheck` + `bunx biome check --write <touched dirs>`.
