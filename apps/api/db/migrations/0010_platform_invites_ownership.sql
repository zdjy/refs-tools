-- migrate:up

-- 平台创建组织邀请码：与成员码（organization_join_codes）分表存储、前缀不同，用途在数据层隔离。
-- 只存 SHA-256 哈希与末 4 位提示，明文仅在创建响应中出现一次；一次性使用，由单条条件 UPDATE 消费。
CREATE TABLE platform_organization_invites (
  id uuid PRIMARY KEY,
  token_hash text NOT NULL CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  hint text NOT NULL CHECK (length(hint) = 4),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  used_at timestamptz,
  used_by uuid REFERENCES users(id),
  used_organization_id uuid REFERENCES organizations(id),
  CHECK (expires_at > created_at),
  -- 使用记录三列同有同无；已使用的码不可再撤销，撤销的码不可再使用。
  CHECK ((used_at IS NULL) = (used_by IS NULL) AND (used_at IS NULL) = (used_organization_id IS NULL)),
  CHECK (used_at IS NULL OR revoked_at IS NULL)
);
CREATE UNIQUE INDEX platform_organization_invites_hash ON platform_organization_invites(token_hash);
CREATE UNIQUE INDEX platform_organization_invites_used_org ON platform_organization_invites(used_organization_id)
  WHERE used_organization_id IS NOT NULL;
CREATE INDEX platform_organization_invites_page ON platform_organization_invites(created_at DESC, id DESC);

-- 负责人发起的所有权移交请求：接收人接受后才在同一事务内换手。
-- 每个组织同一时刻最多一个 pending 请求；到期在创建新请求时于组织行锁内落为 expired。
CREATE TABLE organization_ownership_transfers (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  from_user_id uuid NOT NULL REFERENCES users(id),
  to_user_id uuid NOT NULL REFERENCES users(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','cancelled','expired','superseded')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  decided_at timestamptz,
  CHECK (from_user_id <> to_user_id),
  CHECK (expires_at > created_at),
  CHECK ((status = 'pending') = (decided_at IS NULL))
);
CREATE UNIQUE INDEX organization_ownership_transfers_pending ON organization_ownership_transfers(organization_id)
  WHERE status = 'pending';
CREATE INDEX organization_ownership_transfers_page ON organization_ownership_transfers(organization_id, created_at DESC, id DESC);
CREATE INDEX organization_ownership_transfers_inbox ON organization_ownership_transfers(to_user_id, created_at DESC, id DESC);

-- migrate:down

DROP INDEX organization_ownership_transfers_inbox;
DROP INDEX organization_ownership_transfers_page;
DROP INDEX organization_ownership_transfers_pending;
DROP TABLE organization_ownership_transfers;
DROP INDEX platform_organization_invites_page;
DROP INDEX platform_organization_invites_used_org;
DROP INDEX platform_organization_invites_hash;
DROP TABLE platform_organization_invites;
