-- migrate:up
ALTER TABLE organization_memberships ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0);
CREATE INDEX organization_memberships_page ON organization_memberships (organization_id,created_at DESC,id DESC);
CREATE TABLE organization_invitations (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL REFERENCES users(id),
  created_by uuid NOT NULL REFERENCES users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','revoked','expired')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  CHECK (expires_at > created_at)
);
CREATE UNIQUE INDEX organization_invitations_pending ON organization_invitations(organization_id,user_id) WHERE status='pending';
CREATE INDEX organization_invitations_page ON organization_invitations(organization_id,created_at DESC,id DESC);
CREATE INDEX organization_invitations_inbox ON organization_invitations(user_id,created_at DESC,id DESC);

-- migrate:down
DROP TABLE organization_invitations;
DROP INDEX organization_memberships_page;
ALTER TABLE organization_memberships DROP COLUMN version;
