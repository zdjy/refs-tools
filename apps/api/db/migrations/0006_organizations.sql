-- migrate:up

-- 兼容已用于授权的归属骨架；旧数据不由迁移自动授予成员或角色。
ALTER TABLE organizations
  ADD COLUMN name text NOT NULL DEFAULT '未命名组织' CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  ADD COLUMN region text NOT NULL DEFAULT '' CHECK (length(region) <= 100),
  ADD COLUMN purpose text NOT NULL DEFAULT '' CHECK (length(purpose) <= 1000),
  ADD COLUMN owner_legal_name text NOT NULL DEFAULT '' CHECK (length(owner_legal_name) <= 80),
  ADD COLUMN contact text NOT NULL DEFAULT '' CHECK (length(contact) <= 200),
  ADD COLUMN reviewed_by uuid REFERENCES users(id),
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN governance_reason text CHECK (length(governance_reason) BETWEEN 1 AND 500),
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  ADD CONSTRAINT organizations_review_pair CHECK ((reviewed_by IS NULL) = (reviewed_at IS NULL));
CREATE INDEX organizations_status_cursor ON organizations(status,created_at DESC,id DESC);
CREATE INDEX organizations_created_cursor ON organizations(created_at DESC,id DESC);

-- migrate:down

DROP INDEX organizations_created_cursor;
DROP INDEX organizations_status_cursor;
ALTER TABLE organizations
  DROP CONSTRAINT organizations_review_pair,
  DROP COLUMN version, DROP COLUMN governance_reason, DROP COLUMN reviewed_at, DROP COLUMN reviewed_by,
  DROP COLUMN contact, DROP COLUMN owner_legal_name, DROP COLUMN purpose, DROP COLUMN region, DROP COLUMN name;
