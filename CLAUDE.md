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

**Verification:** no tests are mandatory (constitution policy). Verify with `npm run lint`, `npx tsc --noEmit` or `npm run build`, then walk the affected UC paths by hand, using the `/dev` fault toggles for alternative flows.

**Git:** never commit implementation work directly to `dev` or `main`. Cut a branch from up-to-date `dev`, one phase or one task per branch: `feature/phase-<n>`, `feature/t-<nnn>` (add the feature number if the task id was reused, e.g. `feature/002-t-012`), or `docs/<topic>`. Merge by PR approved by another team member. Commit messages and PR descriptions name the task IDs and feature number.

**Next.js:** this is Next 16 with breaking changes. Read the relevant guide under `node_modules/next/dist/docs/` before writing Next.js code (see `AGENTS.md`).

## Architecture

**No backend yet.** All screens read and write one shared client-side store. `src/lib/db.ts` (`pg` pool) and `src/lib/queries/` exist but are unused until the SQL is rewritten against the ER diagram; `DATABASE_URL` in `.env.local` is not needed to run the app. `src/app/api/` does not exist.

**State flow (read these together):**
- `src/lib/workflow.ts` holds every use case (UC) as a pure function `(AppState, ...args) => { state, result }`, plus `createSeed()` and `runAutomation()`. Screens never mutate state directly and never build user-facing result text here; they map `result` codes to strings from `src/lib/i18n/dict.ts`.
- `src/lib/store.tsx` (`StoreProvider`, `useStore`) persists `AppState` in `localStorage` (key `rsl-hub-state-v2`) through `useSyncExternalStore`. Every change goes through `run(fn)`, which commits the new state, then calls `runAutomation`, then fires toasts for the automatic events. Changing the `AppState` shape requires bumping `version` and the key, or old browsers load stale data.
- `runAutomation` plays the "System (Auto)" use cases (2S SKU rule match, 3S stock check, 6S label format, 7S stock deduction). It loops until no order changes (max 6 passes), so one user action can move an order several statuses forward.
- Order lifecycle is driven by Thai status strings (`src/lib/order-status.ts`) compared literally throughout `workflow.ts`. `setStatus` clears `manual_reason` and `auto_error` on every transition; `toManual` parks an order at "รอดำเนินการด้วยตนเอง" with a `ManualReason`, which the owning screen's queue uses to pick it up.
- External-system failures are simulated with `state.faults` (`FAULT_KEYS` in `workflow.ts`). Each key maps to an "alternative flow" in a UC; add a key there and a toggle in `/dev` when a new UC has one.
- `src/mock/` supplies seed data that covers every UC path; comments there say which case each row tests.

**Routing:** `src/app/login` is outside the shell. `src/app/(app)/` is wrapped by sidebar + header + `auth-guard`. `src/app/reports/` are print views. Menu structure is `src/lib/nav.ts`, shared with the sitemap page. Folders under `(app)` follow UC ids (2A verify, 1S RSL match, 5A+6A reorder, 8A shipping, 9A labels, 10A cleanup).

**i18n:** `src/lib/i18n/` provides Thai (default) and English dictionaries via `useT()`. UI text must come from the dictionary.

**UI:** shadcn/ui (Radix) in `src/components/ui/`; project-specific shared pieces in `src/components/shared/` (e.g. `data-table.tsx` on TanStack Table, `status-badge.tsx`). Tailwind v4, tokens in `src/app/globals.css`.

## Content source of truth

Three team-supplied documents in `docs/source/` are the source of truth: `use-case-description.pdf` for behaviour, wording and step order; `bizflow-to-be.drawio.xml` for how use cases connect; `er-diagram.drawio.xml` for table and column names. The PDF stores Thai in a way `pdftotext` drops; extract it with PyMuPDF. The draw.io files are plain XML. They change; when the team sends a new version, replace the file here and re-check affected code against it. If they disagree with each other or with the code, the document wins and the conflict goes to the team as a question. Rakuten only: ignore Yahoo!/Amazon/eBay in the documents. Order statuses are the 22 in `src/lib/order-status.ts`; "จัดส่งสำเร็จ" is set only when the carrier confirms delivery (8A), so 7S must not set it. Code comments cite UC step numbers ("ทางเลือก #2", `Q5A.3`); keep those references when editing.

When SQL is added under `src/lib/queries/`: raw SQL only (no ORM, the grading rubric requires listing every statement), constants named after the Q-number with `.` replaced by `_`, parameterized (`$1`) only. If SQL differs from the use case description, fix the description first. Target Q-number scheme is `Q<UC id>.<n>` (`Q4S.1` → `Q4S_1`), but the current UC document does not follow it yet (e.g. 3A uses Q13.1, 4A uses Q11.1). The team is revising it, so treat existing `// Q…` comments as provisional.

## Spec-driven development (spec-kit)

The repo is set up for spec-kit with the Claude integration: skills `speckit-specify`, `-clarify`, `-plan`, `-tasks`, `-analyze`, `-checklist`, `-implement`, `-converge`, `-constitution`, `-taskstoissues` in `.claude/skills/`; templates, PowerShell scripts and the `speckit` workflow in `.specify/`. The constitution at `.specify/memory/constitution.md` is ratified (four principles: pure workflow and single store, UC traceability, UC documents as source of truth, `DESIGN.md` authority); read it before specifying or planning. Spec-kit artifacts are written in Thai. Feature directory resolution uses `SPECIFY_FEATURE` / `SPECIFY_FEATURE_DIRECTORY` or `.specify/feature.json`. The active feature is `specs/001-order-status-alignment` (aligns code to the 22 statuses; its `tasks.md` drives the current work). Order of steps: specify, clarify, plan, tasks, analyze, implement; skipping one needs a reason in the PR.
