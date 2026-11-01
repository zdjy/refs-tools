# Project Context: Basketball Referee Toolkit

## Product

Build a basketball referee comprehensive toolkit and workbench with a mobile-first web client and a web administration console. The client must adapt to desktop screens and support an installable, offline-capable PWA experience. Prioritize fast use courtside: clear hierarchy, large touch targets, resilient forms, and accessible contrast. Do not assume a particular competition rule set; make ruleset-dependent behavior explicit and configurable.

## Architecture and Resource Budget

Production runs on a constrained host (2 CPU cores, 2 GB physical RAM). Keep the deployment and runtime footprint small.

- Prefer a separately built static SPA served directly by Nginx; do not run a Node.js frontend server in production unless a documented requirement justifies it.
- Keep the API stateless and lightweight. A lightweight Node.js framework, Go, or FastAPI are acceptable candidates; choose one only when implementation begins and record the rationale in `docs/decisions/`.
- PostgreSQL is the preferred relational database. SQLite or MySQL are acceptable when their operational trade-offs fit the deployment. Explicitly cap API database connections and tune database memory/connection settings for the host.
- Never transcode video on the application server. Never buffer large uploads or downloads in application memory.
- Store PDFs, audio/video, and post-game records in third-party object storage (for example OSS, COS, Qiniu, or Cloudflare R2). The browser uploads and downloads directly using short-lived, narrowly scoped presigned URLs issued by the API. The API handles authorization and metadata, not media bytes.
- Enforce upload size/type policy, object ownership, URL expiry, and authorization before issuing a presigned URL. Do not expose storage credentials to the client.
- Avoid introducing heavyweight infrastructure or dependencies without a documented need and a decision record.

## Client and PWA

- Design and implement mobile-first, then adapt layouts for tablet and desktop, including the administration console.
- Core workflows should remain useful with an unreliable connection. Define explicitly which data is cached, how offline edits are queued, and how conflicts are surfaced before implementing sync.
- Cache only the minimum necessary data. Do not put sensitive records or access tokens in an unsafe persistent cache. Provide clear stale/offline states and a path to retry failed operations.
- Keep service-worker caching versioned and bounded; do not cache private API responses or signed storage URLs by default.
- Use semantic HTML, keyboard accessibility, labels, visible focus, and touch targets suitable for mobile use.

## UI Design System

- All referee-client and administration-console user interfaces must follow [`docs/ui/fiba_about_ui_specification.md`](docs/ui/fiba_about_ui_specification.md). Read it before implementing or materially changing UI; treat its design tokens, color palette, typography, component shapes, interaction states, and prohibited patterns as the shared baseline.
- Do not introduce a competing visual system or one-off styling without documenting an explicit exception in the relevant product spec. For page-specific requirements, link to the shared UI specification rather than copying or redefining its rules.
- Apply the specification in a way that preserves the product requirements above: mobile-first layout, accessible contrast and keyboard focus, appropriate touch targets, and fast courtside workflows. Do not apply sample marketing/editorial layouts or oversized whitespace mechanically to dense operational screens; keep the shared visual language while adapting layout and density to the task.
- Before completing UI work, check the result against the specification's colors, forbidden styles, component requirements, responsive behavior, and interaction/accessibility states. Where the current specification conflicts with accessibility or an explicit product requirement, satisfy the product/accessibility requirement and record the narrow exception in the relevant spec.

## Testing and Quality

- Use a lightweight unit-test setup such as Vitest when the frontend stack supports it. Keep unit-test execution memory below 300 MB; avoid loading the whole application or heavyweight browser tooling for unit tests.
- Keep pure domain logic (such as scorekeeping, foul tracking, and rule calculations) independently testable. Add focused tests for boundary conditions and ruleset-specific behavior.
- Separate fast unit tests from browser/integration tests. Do not make large test suites part of the low-memory production runtime.
- Run relevant tests and static checks after changes. Report checks that could not be run.

## Security and Data Handling

- Treat referee, match, team, participant, and media data as access-controlled. Enforce authorization on the API for every protected resource; hiding UI controls is not authorization.
- Validate inputs at the API boundary, use parameterized database access, and avoid logging credentials, tokens, signed URLs, or sensitive personal data.
- Keep secrets in deployment-managed environment variables or a secret manager. Commit example placeholders only, never live credentials.
- Use TLS in production and apply least privilege to database and object-storage credentials.

## Repository and Documentation

- Before adding dependencies or choosing foundational technologies, inspect the repository and document consequential choices as ADRs in `docs/decisions/`.
- Put user-visible behavior, requirements, and acceptance criteria in `docs/specs/`. Keep specifications focused and testable.
- Record decisions that affect architecture, security, data ownership, offline sync, or deployment in `docs/decisions/`, including context, decision, alternatives, and consequences.
- Prefer small, scoped changes that follow established project conventions. Do not overwrite unrelated user changes.
- Keep documentation in sync with implementation. Use concise comments only where code intent is not clear from the code itself.

**Language**: Write all technical documentation, specifications in `docs/specs/`, architecture decision records in `docs/decisions/`, issue discussions, and code comments in Simplified Chinese (简体中文). Keep code identifiers (variable, function, and class names) and standard technical terms (such as PWA, ADR, TDD, OSS, Presigned URL, API) in English.
