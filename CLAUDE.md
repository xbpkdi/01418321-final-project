# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

RSL Fulfillment Hub: back-office app for Colorado Co., Ltd. (single actor: Admin) to handle Rakuten Ichiba orders fulfilled through RSL. Phase 1 is Rakuten only (Yahoo! Auctions / Amazon out of scope). It is a university project (01418321, System Analysis and Design). README, `PRODUCT.md` and `DESIGN.md` are written in Thai; `DESIGN.md` is the source for colour tokens and visual rules (Atlassian light tokens, `--coral` as the only brand colour).

## Commands

```bash
npm install
npm run dev      # http://localhost:3000, redirects to /login
npm run build
npm run lint     # eslint (next core-web-vitals + typescript)
```

No test runner is configured. `npx tsc --noEmit` is the only type check besides `next build`. Demo login: `admin@colorado.jp` / `demo1234` (`locked@colorado.jp` exercises the lockout path). The `/dev` page (not in the menu) resets seed data and toggles simulated external-system faults.

## Architecture

**No backend yet.** All screens read and write one shared client-side store. `src/lib/db.ts` (`pg` pool) and `src/lib/queries/` exist but are unused until the ER diagram is done; `DATABASE_URL` in `.env.local` is not needed to run the app. `src/app/api/` does not exist.

**State flow (read these together):**
- `src/lib/workflow.ts` holds every use case (UC) as a pure function `(AppState, ...args) => { state, result }`, plus `createSeed()` and `runAutomation()`. Screens never mutate state directly and never build user-facing result text here; they map `result` codes to strings from `src/lib/i18n/dict.ts`.
- `src/lib/store.tsx` (`StoreProvider`, `useStore`) persists `AppState` in `localStorage` (key `rsl-hub-state-v1`) through `useSyncExternalStore`. Every change goes through `run(fn)`, which commits the new state, then calls `runAutomation`, then fires toasts for the automatic events. Changing the `AppState` shape requires bumping `version` and the key, or old browsers load stale data.
- `runAutomation` plays the "System (Auto)" use cases (2S SKU rule match, 3S stock check, 6S label format, 7S stock deduction). It loops until no order changes (max 6 passes), so one user action can move an order several statuses forward.
- Order lifecycle is driven by Thai status strings (`src/lib/order-status.ts`) compared literally throughout `workflow.ts`. `setStatus` clears `manual_reason` and `auto_error` on every transition; `toManual` parks an order at "รอดำเนินการด้วยตนเอง" with a `ManualReason`, which the owning screen's queue uses to pick it up.
- External-system failures are simulated with `state.faults` (`FAULT_KEYS` in `workflow.ts`). Each key maps to an "alternative flow" in a UC; add a key there and a toggle in `/dev` when a new UC has one.
- `src/mock/` supplies seed data that covers every UC path; comments there say which case each row tests.

**Routing:** `src/app/login` is outside the shell. `src/app/(app)/` is wrapped by sidebar + header + `auth-guard`. `src/app/reports/` are print views. Menu structure is `src/lib/nav.ts`, shared with the sitemap page. Folders under `(app)` follow UC ids (2A verify, 1S RSL match, 5A+6A reorder, 8A shipping, 9A labels, 10A cleanup).

**i18n:** `src/lib/i18n/` provides Thai (default) and English dictionaries via `useT()`. UI text must come from the dictionary.

**UI:** shadcn/ui (Radix) in `src/components/ui/`; project-specific shared pieces in `src/components/shared/` (e.g. `data-table.tsx` on TanStack Table, `status-badge.tsx`). Tailwind v4, tokens in `src/app/globals.css`.

## Content source of truth

Button labels, messages, SQL and step order must match `00-use-case-descriptions.md` word for word. That file lives in the separate `321-sa-proj` repo (not here), next to `ui-design-brief.md` and `frontend-build-plan.md`. Code comments cite UC step numbers ("ทางเลือก #2", `Q5A.3`); keep those references when editing.

When SQL is added under `src/lib/queries/`: raw SQL only (no ORM, the grading rubric requires listing every statement), constants named after the Q-number with `.` replaced by `_` (`Q5.2` → `Q5_2`), parameterized (`$1`) only. If SQL differs from the use case description, fix the description first.

## Spec-driven development (spec-kit)

The repo is set up for spec-kit with the Claude integration: skills `speckit-specify`, `-clarify`, `-plan`, `-tasks`, `-analyze`, `-checklist`, `-implement`, `-converge`, `-constitution`, `-taskstoissues` in `.claude/skills/`; templates, PowerShell scripts and the `speckit` workflow in `.specify/`. The constitution at `.specify/memory/constitution.md` is still the unfilled template; run `speckit-constitution` before relying on it. Feature directory resolution uses `SPECIFY_FEATURE` / `SPECIFY_FEATURE_DIRECTORY` or `.specify/feature.json`.
