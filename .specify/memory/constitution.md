# RSL Fulfillment Hub Constitution

## Core Principles

### I. Pure Workflow, Single Store

Every use case MUST be implemented as a pure function in `src/lib/workflow.ts` with the shape
`(AppState, ...args) => { state, result }`. All state changes MUST go through `run()` from
`src/lib/store.tsx`, which commits the new state and then runs `runAutomation`.
Screens MUST NOT mutate state directly. Screens MUST NOT hold business rules; they only map
`result` codes to text from the i18n dictionary.

Rationale: one shared state and pure transitions keep every screen consistent, let the System
(Auto) use cases chain after any Admin action, and let the same logic move behind a real database
later without rewriting the screens.

### II. Use Case Identity and Traceability

Use cases are identified by a number plus an actor-category letter: `A` for Admin use cases (1A,
2A, 3A, ...) and `S` for System use cases (1S, 2S, 3S, ...). Each category is numbered
independently. Every spec, plan, task, workflow function and code comment that implements or
changes behaviour MUST cite the use case id it belongs to, and the alternative flow ("ทางเลือก #n")
where one applies. Admin use cases are triggered by the Admin; System use cases run through
`runAutomation`. No function, screen or button may be added unless a use case supports it.

Rationale: the use case descriptions are the analysis deliverable of the course. Traceability
from each requirement to code is how the work is graded and how drift is caught.

### III. The Use Case Description Is the Source of Truth

Behaviour, step order, alternative flows, button labels, messages and status names MUST match the
use case description document supplied by the team, word for word. The BizFlow To-Be diagram
(a draw.io file supplied by the team) is the source of truth for how use cases connect: which use
case follows which, and where the flow branches. The ER diagram (a draw.io file supplied by the
team) is the source of truth for table and column names. If these sources disagree, the
disagreement is an open question for the team (see below).

All three documents are expected to change. When the team supplies a new version, it replaces the
previous one, and every affected spec, plan, task and code comment MUST be re-checked against it
before further work continues. The repository does not pin a version of any of them.

When the code and the document disagree, the document wins. When the document disagrees with
itself (for example in numbering or status names), the agent or author MUST NOT guess: record the
conflict as an open question for the team and carry on with the unaffected parts.

Rationale: the document is the graded analysis artifact and the team owns it. Silent guesses make
the implementation diverge from the report.

### IV. Design System Authority

`DESIGN.md` is the authority for all UI decisions: colour tokens, status colour groups, type,
motion, layout and reusable patterns. UI work MUST follow it. A change that `DESIGN.md` does not
allow MUST first be made as an amendment to `DESIGN.md`, not as a one-off in a screen.
All user-visible text MUST come from the Thai/English dictionary in `src/lib/i18n/`, not from
literals inside components.

Rationale: the system is an operate surface where consistency and scan speed matter more than
decoration, and the Topbar language toggle is part of the design.

## Project Constraints

- Scope is Rakuten Ichiba only, with RSL as the fulfilment provider. The use case document and
  BizFlow also name Yahoo! Auctions, Amazon and eBay; the team confirmed this is over-specified,
  so those marketplaces MUST NOT be built or specified.
- The only actor is Admin. There is no customer-facing UI.
- Database access MUST use raw SQL through `pg`, with parameterized queries only (`$1`, `$2`).
  ORMs and string-built SQL are not allowed. Every SQL statement MUST be traceable to a use case
  so the full statement table can be produced for the report.
- No backend is wired yet. `src/lib/db.ts` and `src/lib/queries/` MUST NOT be connected to
  screens until the SQL in the use case document is rewritten against the ER diagram's tables and
  columns and the Q-number recheck below is done. SQL in code MUST use the ER diagram's names.
- Admin credentials MUST be stored in the database with the password hashed, never in plain text.
  Plain-text passwords are allowed only in `src/mock/` while the app runs on mock data, and MUST
  be removed when the database is wired in. TODO(ADMIN_BOOTSTRAP): how the first Admin account is
  created is deferred; decide before the login use case (1A) is connected to the database.
- Order status vocabulary: the values of `orders.order_status` are exactly the 22 statuses in
  `src/lib/order-status.ts`, approved by the team on 2026-10-10. Where the use case document
  differs, the team will correct the document: 4A sets "รอตรวจสอบคำสั่งซื้อ"; 7A sets "ยกเลิกแล้ว"
  (not `'cancelled'`); 9A alt #2 uses "รอพิมพ์ใบปะสินค้า"; 3S routes an order with enough stock to
  "ยังไม่ได้จับคู่" and 4S routes an order without enough stock to "รอ Admin ตัดสินใจสั่งซื้อ";
  carrier progress is `order_status`, not a `shipping_status` column; label and purchase-order
  statuses live in `labels.label_status` and `reorders.reorder_status`, with their own values.
  "จัดส่งสำเร็จ" is set only when the carrier confirms delivery (8A). 7S MUST NOT set it: after
  deducting stock, 7S records `stock_deducted` and leaves `order_status` at "แจ้งเลขติดตามแล้ว".
- Testing policy: no tests are mandatory. A change is verified by `npm run lint`, a type check or
  `npm run build`, and a manual walk-through of the affected use case paths (using the `/dev`
  fault toggles for alternative flows). Adding tests is allowed but never required.
- Language: spec-kit artifacts (`spec.md`, `plan.md`, `tasks.md`, checklists) are written in Thai.
  Code identifiers, commit messages and quoted status strings follow the existing code.
- Next.js in this repository has breaking changes. Before writing Next.js code, the author MUST
  read the relevant guide in `node_modules/next/dist/docs/`, as `AGENTS.md` requires.

## Development Workflow

- Q-number scheme: each query is numbered `Q<UC id>.<n>` with `n` starting at 1 inside that use
  case. Example: the queries of 4S are Q4S.1, Q4S.2, and so on. In code the constant name replaces
  `.` with `_` (`Q4S.1` becomes `Q4S_1`).
- Q-number recheck gate: the current use case document does NOT follow this scheme yet (for
  example 3A uses Q13.1, 4A uses Q11.1, 6A uses Q7.x). The team is revising the document. Until
  the revised document arrives, existing `// Q…` comments in code are provisional and MUST NOT be
  treated as final identifiers. The numbering MUST be rechecked against the revised document
  before any design or implementation work that adds or changes SQL.
- Spec-driven order: specify, then clarify if needed, plan, tasks, analyze, implement. Skipping a
  step requires a reason in the PR description.
- Alternative-flow coverage: every alternative flow caused by an external system MUST have an
  entry in `FAULT_KEYS` and a toggle on the `/dev` page. Seed data in `src/mock/` MUST cover every
  use case path, with a comment saying which case each row tests.
- Changes to `AppState` shape MUST bump `version` and the `localStorage` key together, so old
  browsers do not load stale data.

## Governance

This constitution supersedes other project practices. The project is worked on by a team; an
amendment MUST be made in a pull request approved by at least one team member other than the
author. Each amendment MUST update the version line below and state the reason for the bump.

Versioning follows semantic versioning: MAJOR for removing or redefining a principle, MINOR for
adding a principle or section or materially expanding guidance, PATCH for wording and
clarification. Reviewers MUST check each feature PR against Principles I to IV. Complexity or
deviation MUST be justified in the PR description. Runtime guidance for agents lives in `CLAUDE.md`
and `AGENTS.md`.

**Version**: 1.3.0 | **Ratified**: 2026-10-10 | **Last Amended**: 2026-10-10
