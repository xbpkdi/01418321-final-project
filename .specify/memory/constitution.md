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
`runAutomation`.

Rationale: the use case descriptions are the analysis deliverable of the course. Traceability
from each requirement to code is how the work is graded and how drift is caught.

## Project Constraints

- Phase 1 scope is Rakuten Ichiba only, with RSL as the fulfilment provider. Yahoo! Auctions and
  Amazon are out of scope.
- The only actor is Admin. There is no customer-facing UI.
- No backend exists yet. `src/lib/db.ts` and `src/lib/queries/` MUST NOT be wired into screens
  until the ER diagram is complete and the Q-number recheck below is done.
- Testing policy: no tests are mandatory. A change is verified by `npm run lint`, a type check or
  `npm run build`, and a manual walk-through of the affected use case paths (using the `/dev`
  fault toggles for alternative flows). Adding tests is allowed but never required.
- Language: spec-kit artifacts (`spec.md`, `plan.md`, `tasks.md`, checklists) are written in Thai.
  Code identifiers, commit messages and quoted status strings follow the existing code.

## Development Workflow

- Q-number recheck gate: the Q-number numbering in the current use case document is inconsistent.
  It MUST be rechecked and corrected before any design or implementation work that adds or
  changes SQL. Until then, existing `// Q…` comments in code are provisional and MUST NOT be
  treated as final identifiers.
- Spec-driven order: specify, then clarify if needed, plan, tasks, analyze, implement. Skipping a
  step requires a reason in the PR description.
- Changes to `AppState` shape MUST bump `version` and the `localStorage` key together, so old
  browsers do not load stale data.

## Governance

This constitution supersedes other project practices. The project is worked on by a team; an
amendment MUST be made in a pull request approved by at least one team member other than the
author. Each amendment MUST update the version line below and state the reason for the bump.

Versioning follows semantic versioning: MAJOR for removing or redefining a principle, MINOR for
adding a principle or section or materially expanding guidance, PATCH for wording and
clarification. Reviewers MUST check each feature PR against Principles I and II. Complexity or
deviation MUST be justified in the PR description. Runtime guidance for agents lives in `CLAUDE.md`
and `AGENTS.md`.

**Version**: 1.0.0 | **Ratified**: 2026-10-10 | **Last Amended**: 2026-10-10
