# ADR 0002: Direct Browser-to-Object-Storage Media Flow

- Status: Accepted
- Date: 2026-11-01

## Context

The platform stores referee learning video/audio/PDF resources and user-uploaded officiating record photos. The production host is constrained to 2 CPU cores and 2 GB RAM. Routing media bytes through the API would consume bandwidth, connections, and memory, and could make ordinary referee workflows unavailable during large transfers. The API still needs to authorize uploads and maintain trustworthy metadata and lifecycle state.

## Options

### A. Browser upload/download directly to object storage with short-lived signed access (recommended)

The API authenticates and authorizes the request, issues a narrowly scoped short-lived upload authorization, and records an upload intent. The browser transfers bytes to third-party object storage. Completion is confirmed by a storage event/callback or a client completion request verified by the API; only then is the media record made available.

- Advantages: media traffic bypasses the application host; memory and bandwidth usage stay predictable; storage lifecycle and CDN features can be used.
- Costs: upload completion is asynchronous and needs reconciliation; provider-specific signing and event semantics require an adapter; clients need retry/resume UX.

### B. Proxy media through the API

- Advantages: one origin and simple centralized byte-level handling.
- Costs: API bandwidth and connection pressure; risk of memory buffering or request timeouts; wastes scarce 2C2G resources and violates the no-large-buffering constraint.

### C. Let clients use long-lived storage credentials or public write access

- Advantages: superficially simple client integration.
- Costs: credentials can be extracted and abused; access cannot be constrained reliably to a user, object, operation, size, or time window.

## Decision

Use direct browser-to-third-party-object-storage transfers. The API handles authorization, upload intents, metadata, and state transitions only; it must never proxy or buffer media bytes. Do not transcode media on the application server. The choice of storage vendor remains open and should be made in a later ADR based on region, egress, lifecycle, privacy, and operational requirements.

### Upload lifecycle

1. The authenticated client requests an upload intent with the intended record/category, declared content type, file size, and any domain association (for example, a match record). The API validates the user’s permissions and configured size/type limits.
2. The API creates a pending media row and an unguessable object key under a server-controlled namespace. It binds owner, target scope, expected size/type, expiry, and a unique intent ID to that row. It returns a short-lived, narrowly scoped upload authorization for that exact object and operation (such as a presigned PUT or provider-supported multipart session). No storage secret is returned.
3. The browser transfers the file directly to object storage. Large files, if allowed, use the provider’s multipart/resumable mechanism; chunks are sent by the browser, not buffered by the API. The client can retry while the authorization remains valid or request a renewed authorization for the same pending intent after re-authorization.
4. Object storage emits an event/notification to a small API endpoint or queue consumer. The receiver verifies provider authenticity (signature, credentials, or trusted network mechanism), bucket, key, intent, and event type. Alternatively, the browser calls a completion endpoint and the API independently verifies object existence and server-observed metadata using a storage HEAD/stat request. A client assertion alone is never proof of successful upload.
5. The API verifies actual size and allowed media type/metadata, checks intent expiry and object ownership binding, and performs an idempotent transition from `pending` to `available`. Persist only metadata needed by the product (owner, scope, object key, size, media type, checksum/version when available, timestamps, and status). Do not expose provider credentials or treat client-supplied metadata as authoritative.
6. If the upload is rejected, abandoned, or expires, mark the intent accordingly and remove incomplete/orphaned objects through an idempotent cleanup job or storage lifecycle policy. Duplicate/out-of-order notifications must not create duplicate records or revive expired/rejected intents.

### Downloads and authorization

The client requests access to a media record, and the API checks the caller’s current permissions and record scope before issuing a short-lived read URL or redirect. Keep objects private by default. Do not persist signed URLs in application records, service-worker caches, analytics, or logs. For public learning materials, use an explicit publication/access policy rather than making the whole bucket public. Revocation takes effect for newly issued URLs; already-issued URLs remain usable until their short expiry, so choose TTLs accordingly.

### Resource and security constraints

- Keep API upload-intent/completion endpoints small and stateless. Enforce request limits and bounded database/storage connection pools.
- Configure bucket CORS only for required application origins and methods. Restrict upload authorizations to an exact object key, method, expiry, and expected headers/length constraints supported by the provider.
- Treat content type and filename from the browser as untrusted. Validate size and allowed formats; use generated storage keys rather than user filenames. Consider quarantine/scanning before making risky content downloadable.
- Protect event endpoints against spoofing and replay. Make intent/event processing idempotent and retain enough event identifiers/state for deduplication.
- Apply per-user and per-scope quotas/rate limits. Prevent users from choosing another owner’s key or attaching an upload to a record they cannot access.
- Do not log presigned URLs, signed headers, tokens, or personal data. Use TLS for API and storage transfers.
- Configure storage lifecycle and deletion flows so that expired uploads, deleted records, and retention policies do not leave untracked objects indefinitely.

## Consequences

- API and host bandwidth is reserved for control-plane traffic and ordinary API requests, not media bytes.
- Media records have an explicit pending/available/rejected/expired/deleted lifecycle; clients must display upload progress, stale/offline state, retry, and terminal failure clearly.
- Storage vendor integration must be isolated behind a small adapter so signed URLs/events can change without leaking vendor specifics into domain logic.
- Offline clients may queue upload intent metadata but cannot complete a transfer until connected. The UI must clearly distinguish locally queued work from a server-confirmed upload.
- The upload flow has eventual completion rather than a single synchronous transaction. Reconciliation and orphan cleanup are required.

## Risks and Mitigations

- **Forged or duplicate completion event:** verify provider authenticity and object state; use intent binding, expiry, idempotent state transitions, and deduplication.
- **Malicious or oversized files:** enforce server-side declared limits before signing and verify actual object metadata after upload; quarantine or scan where risk requires it.
- **Leaked signed URL:** keep TTL and scope narrow, redact logs, avoid persistent caching, and support object revocation/deletion where the provider allows it.
- **CORS/provider incompatibility:** validate the chosen provider’s browser upload flow, multipart limits, signed header behavior, and event delivery in a deployment spike before locking vendor-specific details.
- **Orphaned objects or stuck pending rows:** run a bounded cleanup/reconciliation task and monitor age/count of pending intents without introducing heavyweight infrastructure.
- **Unauthorized cross-scope association:** authorize both intent creation and completion against the bound owner and target record; never rely on client-selected object paths or IDs alone.

## Follow-up

Specify the media entity/state machine, retention/deletion policy, accepted formats and size limits, and recovery UX before implementation. Select the object-storage provider and signing mechanism in a separate ADR.
