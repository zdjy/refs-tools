-- migrate:up

-- 归属与状态骨架提前用于实时授权，业务字段由 Task 7/15 的后续迁移补齐，见 ADR 0014。
CREATE TABLE organizations (
  id uuid PRIMARY KEY,
  owner_user_id uuid NOT NULL REFERENCES users (id),
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','active','frozen','rejected','dissolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TABLE organization_memberships (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations (id),
  user_id uuid NOT NULL REFERENCES users (id),
  status text NOT NULL CHECK (status IN ('pending','active','rejected','left','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX organization_memberships_current ON organization_memberships (organization_id,user_id) WHERE status IN ('pending','active');
CREATE TRIGGER organization_memberships_updated_at BEFORE UPDATE ON organization_memberships FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TABLE events (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations (id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_organization ON events (organization_id);
CREATE TRIGGER events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TABLE matches (
  id uuid PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES events (id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','partially_confirmed','confirmed','in_progress','completed','cancelled','exception')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX matches_event ON matches (event_id);
CREATE TRIGGER matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 平台与业务角色统一存储，以 CHECK 固定合法角色/范围组合；普通裁判的 self 权限由所有权派生。
CREATE TABLE role_bindings (
  id uuid PRIMARY KEY,
  subject_user_id uuid NOT NULL REFERENCES users (id),
  role text NOT NULL,
  scope_type text NOT NULL,
  scope_id uuid,
  granted_by uuid NOT NULL REFERENCES users (id),
  starts_at timestamptz NOT NULL,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT role_bindings_scope CHECK (
    (role IN ('platform_admin','content_editor','grader','moderator') AND scope_type = 'platform' AND scope_id IS NULL)
    OR (role IN ('owner','certifier') AND scope_type = 'organization' AND scope_id IS NOT NULL)
    OR (role = 'organizer' AND scope_type IN ('organization','event') AND scope_id IS NOT NULL)
    OR (role = 'head_referee' AND scope_type IN ('event','match') AND scope_id IS NOT NULL)
  ),
  CONSTRAINT role_bindings_dates CHECK (expires_at IS NULL OR expires_at > starts_at)
);
CREATE UNIQUE INDEX role_bindings_current ON role_bindings (subject_user_id,role,scope_type,scope_id) NULLS NOT DISTINCT WHERE revoked_at IS NULL;
CREATE TRIGGER role_bindings_updated_at BEFORE UPDATE ON role_bindings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE audit_events (
  id uuid PRIMARY KEY,
  actor_user_id uuid NOT NULL,
  action text NOT NULL CHECK (length(action) BETWEEN 1 AND 80),
  resource_type text NOT NULL CHECK (length(resource_type) BETWEEN 1 AND 80),
  resource_id uuid NOT NULL,
  scope_type text NOT NULL CHECK (scope_type IN ('platform','self','organization','event','match')),
  scope_id uuid,
  organization_id uuid REFERENCES organizations (id),
  reason text CHECK (length(reason) <= 500),
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_events_scope CHECK (
    (scope_type = 'platform' AND scope_id IS NULL AND organization_id IS NULL)
    OR (scope_type = 'self' AND scope_id IS NOT NULL AND organization_id IS NULL)
    OR (scope_type = 'organization' AND scope_id IS NOT NULL AND organization_id IS NOT NULL AND organization_id = scope_id)
    OR (scope_type IN ('event','match') AND scope_id IS NOT NULL AND organization_id IS NOT NULL)
  ),
  CONSTRAINT audit_events_snapshot_size CHECK ((before IS NULL OR pg_column_size(before) <= 2048) AND (after IS NULL OR pg_column_size(after) <= 2048))
);
CREATE INDEX audit_events_cursor ON audit_events (created_at DESC,id DESC);
CREATE INDEX audit_events_organization_cursor ON audit_events (organization_id,created_at DESC,id DESC);
CREATE INDEX audit_events_resource ON audit_events (resource_type,resource_id);
REVOKE ALL ON audit_events FROM PUBLIC;

CREATE FUNCTION reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '审计记录仅允许追加' USING ERRCODE = '42501';
END;
$$;
CREATE TRIGGER audit_events_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_events
FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_mutation();

-- migrate:down

DROP TABLE audit_events;
DROP FUNCTION reject_audit_mutation();
DROP TABLE role_bindings;
DROP TABLE matches;
DROP TABLE events;
DROP TABLE organization_memberships;
DROP TABLE organizations;
