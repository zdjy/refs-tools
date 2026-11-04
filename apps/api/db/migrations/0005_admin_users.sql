-- migrate:up

ALTER TABLE users ADD COLUMN deleted_at timestamptz;
ALTER TABLE users ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version >= 1);
ALTER TABLE users ADD CONSTRAINT users_deleted_disabled CHECK (deleted_at IS NULL OR status = 'disabled');
CREATE INDEX users_admin_list ON users (created_at DESC, id DESC) WHERE deleted_at IS NULL;

-- migrate:down

DROP INDEX users_admin_list;
ALTER TABLE users DROP CONSTRAINT users_deleted_disabled;
ALTER TABLE users DROP COLUMN version;
ALTER TABLE users DROP COLUMN deleted_at;
