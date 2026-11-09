-- migrate:up
CREATE TABLE certifications (
  id uuid PRIMARY KEY,
  subject_user_id uuid NOT NULL REFERENCES users(id),
  scope_type text NOT NULL CHECK (scope_type IN ('platform','organization')),
  organization_id uuid REFERENCES organizations(id),
  status text NOT NULL CHECK (status IN ('draft','under_review','approved','rejected','suspended','revoked','needs_more_information')),
  version integer NOT NULL CHECK (version > 0),
  payload jsonb NOT NULL,
  idempotency_key text NOT NULL,
  request_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subject_user_id,idempotency_key),
  CHECK ((scope_type='platform' AND organization_id IS NULL) OR (scope_type='organization' AND organization_id IS NOT NULL)),
  CHECK ((payload->>'id'=id::text AND payload->>'subjectUserId'=subject_user_id::text
    AND payload->>'status'=status AND (payload->>'version')::integer=version
    AND payload->'scope'->>'type'=scope_type
    AND (payload->'scope'->>'organizationId') IS NOT DISTINCT FROM organization_id::text) IS TRUE),
  CHECK (payload->>'level' IN ('national','level_1','level_2','level_3'))
);
CREATE UNIQUE INDEX certifications_current_organization ON certifications(subject_user_id,organization_id) WHERE scope_type='organization';
CREATE UNIQUE INDEX certifications_current_platform ON certifications(subject_user_id) WHERE scope_type='platform';
CREATE INDEX certifications_queue ON certifications(scope_type,organization_id,status,created_at DESC,id DESC);
CREATE TABLE certification_history (
  certification_id uuid NOT NULL REFERENCES certifications(id),
  version integer NOT NULL CHECK (version > 0),
  record jsonb NOT NULL,
  actor_user_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL,
  created_at timestamptz NOT NULL,
  PRIMARY KEY(certification_id,version)
);
CREATE TRIGGER certification_history_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON certification_history
  FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_mutation();
CREATE TABLE certification_media (
  certification_id uuid NOT NULL,
  version integer NOT NULL,
  media_id uuid NOT NULL REFERENCES media_objects(id),
  kind text NOT NULL CHECK (kind IN ('evidence','history','appeal')),
  PRIMARY KEY(certification_id,version,media_id,kind),
  FOREIGN KEY(certification_id,version) REFERENCES certification_history(certification_id,version)
);
CREATE TRIGGER certification_media_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON certification_media
  FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_mutation();
CREATE INDEX certification_media_lookup ON certification_media(media_id,certification_id);
CREATE TABLE certification_appeals (
  id uuid PRIMARY KEY,
  certification_id uuid NOT NULL REFERENCES certifications(id),
  appellant_id uuid NOT NULL REFERENCES users(id),
  original_reviewer_id uuid REFERENCES users(id),
  reviewer_id uuid REFERENCES users(id),
  status text NOT NULL CHECK (status IN ('pending','decided')),
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  CHECK ((payload->>'id'=id::text AND payload->>'certificationId'=certification_id::text
    AND payload->>'appellantId'=appellant_id::text AND payload->>'status'=status
    AND (payload->>'originalReviewerId') IS NOT DISTINCT FROM original_reviewer_id::text
    AND (payload->>'reviewerId') IS NOT DISTINCT FROM reviewer_id::text) IS TRUE),
  CHECK (reviewer_id IS NULL OR reviewer_id<>appellant_id),
  CHECK (reviewer_id IS NULL OR original_reviewer_id IS NULL OR reviewer_id<>original_reviewer_id),
  CHECK ((status='pending' AND reviewer_id IS NULL) OR (status='decided' AND reviewer_id IS NOT NULL))
);
CREATE UNIQUE INDEX certification_pending_appeal ON certification_appeals(certification_id) WHERE status='pending';
CREATE INDEX certification_appeals_history ON certification_appeals(certification_id,created_at DESC,id DESC);

-- migrate:down
DROP TABLE certification_appeals;
DROP TABLE certification_media;
DROP TABLE certification_history;
DROP TABLE certifications;
