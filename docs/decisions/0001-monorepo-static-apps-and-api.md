# ADR 0001: Monorepo with Static Client Apps and a Separate API

- Status: Accepted
- Date: 2026-10-19

## Context

The product has a mobile-first referee client that also works on desktop. A separately sourced desktop-oriented administration template may be kept for evaluation, but is not a deployed workspace application. Production is limited to 2 CPU cores and 2 GB RAM. The frontend must not consume production application-server memory, and the system should remain straightforward to build and deploy.

## Options

### A. Monorepo with independently built SPAs and a separate API (recommended)

A pnpm workspace can contain the referee client, API, and small shared packages for API schemas, domain types, and design primitives. An independently sourced administration template can remain outside the workspace. Deployed build outputs are static assets served by Nginx. The API is a separately deployed, lightweight service.

- Advantages: shared contracts and selected UI primitives without coupling release/runtime lifecycles; one repository simplifies coordinated changes; static frontends consume no Node.js runtime memory in production.
- Costs: workspace tooling and dependency boundaries need discipline; shared packages can become an accidental coupling point; CI may build more than necessary unless targets are scoped.

### B. Separate repositories for client, future admin, and API

- Advantages: independent access controls and release cadence; clearer repository ownership at larger organizational scale.
- Costs: duplicated tooling and contract versioning; coordinated changes are harder for a small team; more repository and pipeline overhead.

### C. Full-stack merged application with server-rendered or server-served frontend

- Advantages: one application entry point and potentially simpler server-side routing or initial rendering.
- Costs: frontend runtime competes with API and database for the constrained host; larger deployable unit and memory spikes; less aligned with directly serving static assets from Nginx. A static-exporting full-stack framework would reduce runtime cost but still needs a demonstrated requirement to justify added coupling.

## Decision

Use a pnpm-workspace Monorepo with independently buildable applications and a separate API. The initial repository layout should follow this shape, adjusted to actual framework conventions:

```text
apps/
  referee-web/       # responsive, installable client SPA
  api/               # lightweight stateless API
packages/
  contracts/         # API schemas and shared transport types
  domain/            # pure shared domain logic, only when genuinely shared
  ui/                # accessible primitives, only where interaction is consistent
```

The referee SPA is built in CI and deployed as static files to Nginx/CDN. The API runs independently as a lightweight service. Do not deploy a Node.js frontend server on the 2C2G host. Keep shared packages small and do not force independently sourced experiences into one UI shell or share components whose behavior differs materially. API schemas are the preferred sharing boundary; generate clients/types from a canonical schema when practical rather than duplicating contracts by hand.

The database may share the host only after connection limits and memory budgets are configured; this ADR does not select the API framework or database. Record those choices separately after deployment constraints and operational expertise are known.

## Consequences

- Frontend builds and API releases can be independently deployed while retaining a single source tree.
- Nginx serves compressed, fingerprinted static assets; API requests use a clearly configured same-origin route or explicit API origin.
- CI should support workspace-filtered builds and validate shared contract changes against all consumers.
- Shared code must remain runtime-light and browser/server compatible. Do not put secrets, server-only storage SDK credentials, or environment-specific configuration in browser-shared packages.
- SPA routing, cache invalidation, and backward compatibility between independently released frontend and API versions must be handled deliberately.

## Risks and Mitigations

- **Shared package coupling:** publish stable boundaries and require consumers to opt into shared UI; prefer schemas and pure domain logic.
- **Build memory pressure:** build apps serially or cap CI parallelism; keep dependencies lean. The production host serves artifacts and does not perform builds.
- **API/frontend version skew:** use additive API changes and compatibility tests; version or deprecate breaking contracts explicitly.
- **Scope drift into a monorepo platform project:** start with a small workspace and add task orchestration/caching only when measured build times justify it.
