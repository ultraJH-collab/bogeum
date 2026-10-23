# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

보금 — a no-build, zero-dependency Korean rental-safety web app (villa AI pricing, HUG 126% deposit-guarantee check, escrow direct contract, move-in/out photo vault) plus OpenAI-powered chat and contract-wording review. Listing/registry/transaction data is mock; identity verification, escrow and payments are simulated. UI text and code comments are Korean.

## Commands

- Run: `node server.js` → http://localhost:5180 (`.claude/launch.json` entry `bogeum`). Loads `.env` via `process.loadEnvFile`.
- Syntax check (no linter/bundler/tests): `node --check js/*.js api/ai.js server.js`
- Engines headless: `node -e "global.window=global; require('./js/data.js'); require('./js/engines.js'); console.log(BG.eng.diagnose(BG.LISTINGS[2]))"`
- Deploy: `npx vercel deploy --prod` (Vercel env: `OPENAI_API_KEY`, optional `OPENAI_MODEL`). In PowerShell `npx` is blocked by execution policy — use `npx.cmd` or Git Bash.
- The in-app browser pane screenshots desktop emulation incorrectly (DPR 1.25); use Playwright MCP for desktop-width screenshots, and delete the `.playwright-mcp/` folder it writes into the project.

## Architecture

Plain `<script>` tags sharing `window.BG`, loaded in order `config → data → engines → account → app → ai`.

- `js/engines.js` — pure functions on `BG.eng`: seeded comparable sales → hedonic `estimate`; `hug` = deposit + senior 채권최고액 + (다가구) senior lease ≤ official price × 1.26, violation buildings always fail; `diagnose` → 8 checks, level 0/1/2, score.
- `js/app.js` — one IIFE: hash router `#/<page>/<arg>` (home, listing, check, contract, vault, report, my, login); views return HTML strings; `render(keepScroll)` swaps `#view` and window scroll. Event delegation: `data-act` → `actions`, `data-go` → navigation, `data-input` → `inputs`. Add interactions as keys, not listeners. Partial re-renders for `#hug-block`, `#manual-result`, `#fee-out`, home list. State persisted per key via `store` (localStorage `bg_` prefix); `store.set` also calls `BG.account.push`.
- `js/account.js` — ID/password accounts with **no email**: Supabase project `bogeum` (ref `vvngpbhapjdhcchyetxc`, ap-northeast-2). Does not use Supabase Auth. Tables live in schema `private` (not exposed); the browser calls only `public.bg_*` SECURITY DEFINER RPCs with the publishable key: `bg_signup`, `bg_login` (bcrypt, 5 failures → 10-min lock), `bg_logout`, `bg_me`, `bg_state_get/put/clear` (keys whitelisted in a CHECK constraint), `bg_ai_use` (60/day). Session token = 32 random bytes, stored hashed (sha256) server-side, 30-day expiry, kept in `localStorage.bg_session`. On login `pull()` takes server values, uploads local-only keys, then `BG.app.reloadState()`. The advisor warnings about anon-executable SECURITY DEFINER functions are intentional.
- `js/ai.js` + `api/ai.js` — `GET /api/ai` reports `ready`; the chat button is drawn only then. `POST /api/ai` requires the `bg_` session token as Bearer, calls `bg_ai_use` before OpenAI, streams Chat Completions as plain text. `mode: 'chat'` embeds an app guide + current-screen context (listing diagnosis); `mode: 'review'` returns a fixed-format risk review of pasted text. The OpenAI key exists only in `.env` / Vercel env — never in browser code.
- `css/app.css` — tokens on `:root`. Design: cool paper `#F1F4F1`, ink `#16262E`, pine `#1D6A50`; Gowun Batang for headings/large numbers, IBM Plex Sans KR for text. The safety score is drawn as a rotated seal stamp (`stamp()` in app.js) — the single bold element; keep the rest quiet. ≥1024px: left rail replaces tab bar, home is list|map, listing detail is two columns (`.d-side` is `display: contents` below 1024px with `order` on children — keep both).
- `sw.js` — network-first shell cache, registered only on https; bump `CACHE` when shell files change.

## Conventions

- Money in data/engines is 만원; display via `E.fmtMan` / `E.fmtWon`.
- Legal/financial copy is demo text and stays labeled as such.
