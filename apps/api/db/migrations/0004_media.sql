-- migrate:up

CREATE TABLE media_objects (
  id uuid PRIMARY KEY,
  owner_user_id uuid NOT NULL REFERENCES users(id),
  purpose text NOT NULL CHECK (purpose IN ('learning','certification_evidence','exam_answer','forum_attachment','post_game_record')),
  object_key text NOT NULL UNIQUE,
  idempotency_key text NOT NULL,
  request_fingerprint text NOT NULL,
  UNIQUE (owner_user_id,idempotency_key),
  target_type text NOT NULL CHECK (target_type IN ('self','platform','organization','attempt','match')),
  target_id uuid,
  original_file_name text,
  declared_content_type text NOT NULL,
  expected_size_bytes bigint NOT NULL CHECK (expected_size_bytes BETWEEN 1 AND 524288000),
  verified_size_bytes bigint,
  etag text,
  status text NOT NULL DEFAULT 'pending_upload' CHECK (status IN ('pending_upload','available','rejected','expired','deleted')),
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  deleted_at timestamptz,
  cleaned_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_self_owner CHECK (target_type <> 'self' OR target_id = owner_user_id),
  CONSTRAINT media_target CHECK ((target_type = 'platform' AND target_id IS NULL) OR (target_type <> 'platform' AND target_id IS NOT NULL)),
  CONSTRAINT media_verified CHECK (status <> 'available' OR (verified_at IS NOT NULL AND verified_size_bytes IS NOT NULL AND verified_size_bytes = expected_size_bytes AND etag IS NOT NULL)),
  CONSTRAINT media_dates CHECK (expires_at > created_at AND (status <> 'deleted' OR deleted_at IS NOT NULL))
);
CREATE INDEX media_owner_created ON media_objects(owner_user_id,created_at);
CREATE INDEX media_cleanup ON media_objects(expires_at) WHERE cleaned_at IS NULL;
CREATE TRIGGER media_objects_updated_at BEFORE UPDATE ON media_objects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TABLE media_upload_events (
  provider_event_id text PRIMARY KEY,
  media_id uuid NOT NULL REFERENCES media_objects(id),
  received_at timestamptz NOT NULL
);

-- migrate:down

DROP TABLE media_upload_events;
DROP TABLE media_objects;
