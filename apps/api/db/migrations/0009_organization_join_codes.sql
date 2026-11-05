-- migrate:up

-- 成员码只保存 SHA-256 哈希与末 4 位提示，明文仅在创建响应中出现一次；用途仅限加入组织，不授予任何角色。
CREATE TABLE organization_join_codes (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  token_hash text NOT NULL CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  hint text NOT NULL CHECK (length(hint) = 4),
  max_uses integer NOT NULL CHECK (max_uses BETWEEN 1 AND 100),
  -- 消费用单条条件 UPDATE 递增；CHECK 兜底，任何路径都不可能超过 max_uses。
  uses integer NOT NULL DEFAULT 0 CHECK (uses >= 0 AND uses <= max_uses),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (expires_at > created_at)
);
CREATE UNIQUE INDEX organization_join_codes_hash ON organization_join_codes(token_hash);
CREATE INDEX organization_join_codes_page ON organization_join_codes(organization_id,created_at DESC,id DESC);

-- 自助申请的待审核数量上限与目录检索都按负责人/状态过滤。
CREATE INDEX organizations_owner_status ON organizations(owner_user_id,status);
-- 目录按活跃成员计数。
CREATE INDEX organization_memberships_active ON organization_memberships(organization_id) WHERE status='active';

-- migrate:down

DROP INDEX organization_memberships_active;
DROP INDEX organizations_owner_status;
DROP TABLE organization_join_codes;
