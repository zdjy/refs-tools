# ADR 0003: Scoped RBAC with Explicit Assignment Workflow

- Status: Accepted
- Date: 2026-11-01

## Context

The platform has personal referee records, qualification information, match assignments, and organization-managed workflows. The initial roles are:

- ordinary registered referee;
- verified referee with a qualification level (national, level 1, level 2, or level 3);
- event organizer or head referee who can manage competitions and make assignments;
- system administrator.

A single global role is insufficient. A referee should control personal data without being able to alter an event’s roster; an organizer should manage only competitions and assignments in their organization; a head referee may need a narrower operational scope; and a system administrator must be able to operate the platform without silently becoming the data owner of every business action. Qualification is a verified attribute, not automatically a grant of administrative power.

## Options

### A. Global role-only RBAC

Each account gets one or more global roles, and endpoints check those roles.

- Advantages: minimal schema and simple early implementation.
- Costs: cannot represent organization boundaries or event-specific assignment authority; encourages broad roles and IDOR vulnerabilities; qualification and business authority become conflated.

### B. Hard-coded role plus resource-specific exceptions

Keep global roles and add ad hoc checks for event owner, match, or assignment records.

- Advantages: can cover immediate cases without a general authorization model.
- Costs: authorization logic spreads across handlers; difficult to audit and test; exception rules become inconsistent as organizations and workflows grow.

### C. Global baseline roles plus scoped role bindings and explicit workflow state (recommended)

Use a compact RBAC model: permissions are granted through roles, role bindings carry an explicit scope, and sensitive business operations additionally require a domain state transition. Keep qualification as a separate verified profile attribute. Ownership and authorization are evaluated on the server for every protected resource.

- Advantages: supports personal ownership and organization/event boundaries; assignment lifecycle is auditable; roles stay small; future roles can be added without rewriting every endpoint.
- Costs: requires scope resolution and policy tests; role revocation and workflow concurrency need careful handling.

## Decision

Adopt option C. Implement authorization as **subject + permission + resource + scope + current workflow state**, not as a UI-only role check. Deny by default. Every protected API endpoint performs a server-side authorization decision and object-level access check.

### Identity, profile, qualification, and authority

Keep these concerns separate:

- `users`: authentication identity and account lifecycle.
- `referee_profiles`: the user’s personal referee profile and user-owned data.
- `referee_qualifications`: verified qualification records, level, issuer, evidence reference, effective/expiry dates, status, and audit fields. A level such as national/1/2/3 is an attribute used by eligibility rules; it does not itself grant organization-management permissions.
- `organizations`: clubs, associations, event operators, or other administrative boundaries.
- `organization_memberships`: a user’s membership and status in an organization.
- `role_bindings`: role assignment for a subject within an explicit scope, with grantor, timestamps, and optional expiry.
- `events` and `matches`: organization-owned competition resources and their operational units.
- `assignment_workflows` / `assignments`: candidate, proposed, invited, accepted, declined, replaced, cancelled, and completed states as appropriate to the product; each transition is audited.
- `audit_events`: append-only records for grants, revocations, qualification verification, assignment changes, and other sensitive actions.

Do not encode organization membership, qualification, or assignment status only in a token. Tokens can carry a user identifier and short-lived session claims, but the API must use current server-side state for sensitive decisions and must handle revocation.

### Initial roles and permissions

Use a small permission vocabulary. Examples below are conceptual names; the implementation should centralize them rather than scatter string literals through route handlers.

| Role | Scope | Core permissions | Explicit limits |
| --- | --- | --- | --- |
| Registered referee | self | read/update own profile; manage own availability/preferences; read own assignments; respond to invitations; create/update own allowed records | cannot verify qualifications; cannot manage organization/event resources; cannot read another referee’s private data |
| Verified referee | self, plus registered-referee permissions | use verified qualification in eligibility checks; access features gated by current verified status | qualification level alone grants no org or assignment-management permission; evidence and verification remain protected |
| Organizer | organization, optionally event | manage organization events and operational resources; create assignment campaigns; view only data required for legitimate selection; propose/invite/replace assignments according to policy | cannot read unrestricted personal data; cannot alter qualification evidence; cannot act outside bound organization/event scope |
| Head referee | event or match | manage officiating operations for assigned event/match; review eligible candidates; propose/confirm/reassign within delegated scope; record operational reports | no organization-wide administration unless separately bound; cannot change identity or qualification records |
| System administrator | platform | manage accounts, platform configuration, abuse/security operations, and verified qualification review when explicitly assigned | access to business data is purpose-limited and audited; should not silently perform organizer actions or impersonate users |

A user may hold multiple bindings. For example, the same account can be a verified referee in self scope, a head referee for one event, and an organizer in one organization. Effective permissions are the union of active bindings, but scope is never widened by the union: a request must match at least one binding and its resource scope.

### Scope model

Represent scope explicitly instead of inferring it from role names:

```text
role_bindings
  id
  subject_user_id
  role
  scope_type       # self | platform | organization | event | match
  scope_id         # null for platform; subject user id for self
  granted_by
  starts_at
  expires_at       # nullable, but preferred for delegated operational roles
  revoked_at
```

The authorization layer resolves the resource’s owning organization/event/match and checks that it is within the binding’s active scope. For self-scoped data, ownership must match the authenticated subject. Do not allow a client to submit an arbitrary `scope_id` and have it accepted without validating the grantor’s authority.

Where a resource is shared, define its owner and access purpose explicitly. For example, an assignment candidate view may expose only the minimum availability, qualification summary, and contact channel needed for selection; it must not return unrelated personal records, private notes, or evidence documents. Use purpose-specific query/read models rather than exposing the entire referee profile to organizers.

### Assignment workflow boundary

Separate **eligibility**, **selection authority**, and **acceptance**:

1. The organizer/head referee creates an assignment campaign or match demand within their scope.
2. The server derives eligible candidates from current verified qualification, availability, conflicts, and event rules. Client-provided eligibility is advisory only.
3. An authorized operator proposes or invites a candidate. The API records actor, reason/context as appropriate, target scope, and a version of the match/campaign state.
4. The referee accepts or declines their own invitation. A referee cannot accept on behalf of another referee.
5. Replacements, confirmation, cancellation, and completion are explicit state transitions. Each transition checks the current version/state, the actor’s scope, and relevant conflicts, then emits an audit event.
6. Concurrent changes use optimistic concurrency (for example, a version number or conditional update). A stale operation returns a conflict for the UI to resolve; it must not silently overwrite another assignment decision.

The system should not infer that being assigned to a match grants broad access to all event data. Assignment grants only the operational data needed for that match and period. Likewise, an organizer’s selection authority does not grant ownership of a referee’s private profile.

### Authorization enforcement shape

Centralize policy decisions in a small authorization module/service with resource loaders that enforce tenant boundaries. A route should follow this conceptual order:

1. authenticate the session;
2. validate request shape and identifiers;
3. load the resource through an access-controlled query or resolve its scope;
4. evaluate permission, binding scope, ownership, and workflow state;
5. perform the state-changing operation transactionally;
6. append an audit event for sensitive operations.

Avoid relying on controller-level `if role == ...` checks alone. Test allow and deny cases for each role, scope, ownership boundary, revoked/expired binding, stale workflow version, and cross-organization identifier. Return a generic not-found response where appropriate to avoid leaking the existence of resources the caller cannot access.

## Data protection and audit requirements

- Personal referee data, qualification evidence, media, and operational notes are protected resources with separate field-level exposure rules where needed.
- Qualification verification requires a designated permission and must capture verifier, source/evidence reference, decision, timestamps, and status history.
- Granting or revoking organizer/head-referee bindings, changing assignment state, and accessing sensitive evidence must be auditable.
- System administrators’ access to protected business data is logged and reviewable; break-glass access, if introduced, must be time-limited, reason-coded, and separately audited.
- Authorization decisions must remain correct after session/token refresh, membership changes, role revocation, and event closure.

## Consequences

- The schema is slightly larger than global RBAC, but the model directly represents personal ownership, organization tenancy, delegated event authority, and match operations.
- Qualification verification and authorization can evolve independently: new qualification levels or issuers do not require new administrative roles.
- The API and UI need shared permission vocabulary and clear denial/offline states, but the API remains the source of truth.
- Assignment handling becomes an auditable state machine rather than a mutable roster field, which improves dispute handling and concurrency safety.
- Reporting and candidate search need privacy-aware projections and must be checked against scope; broad joins over raw profiles should be avoided.

## Risks and Mitigations

- **Scope escalation through IDs:** resolve ownership server-side, never trust submitted organization/event IDs, and add cross-tenant authorization tests.
- **Role explosion:** keep roles tied to stable capabilities and use scoped bindings/delegations; do not create a role for every event variation.
- **Stale permissions in tokens:** keep sensitive grants server-side, use short-lived sessions, and revoke/refresh claims promptly.
- **Overexposure during selection:** create a minimum-purpose candidate projection and field-level policy tests; log sensitive access.
- **Ambiguous qualification status:** model pending, verified, expired, suspended, and rejected states with effective dates; eligibility must use current status.
- **Concurrent assignment edits:** use transactional state transitions and optimistic concurrency; surface conflicts instead of last-write-wins.
- **Administrator overreach:** separate platform support permissions from business-operational permissions; audit and review administrator reads/writes.

## Follow-up

Define the initial permission catalog, organization lifecycle, qualification verification process, assignment state machine, privacy/retention requirements, and API error semantics in focused specifications under `docs/specs/` before implementing endpoints.
