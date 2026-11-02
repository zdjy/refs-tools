-- migrate:up

CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  email_verified_at timestamptz,
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 80),
  password_hash text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_normalized CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 254),
  CONSTRAINT users_email_unique UNIQUE (email)
);
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE email_challenges (
  id uuid PRIMARY KEY,
  email text NOT NULL CHECK (email = lower(btrim(email))),
  purpose text NOT NULL CHECK (purpose IN ('register', 'login', 'password')),
  code_hash text NOT NULL CHECK (code_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_challenges_expiry ON email_challenges (expires_at);
CREATE TRIGGER email_challenges_updated_at BEFORE UPDATE ON email_challenges FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE auth_sessions (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid NOT NULL REFERENCES users (id),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_sessions_user ON auth_sessions (user_id);
CREATE INDEX auth_sessions_expiry ON auth_sessions (expires_at);
CREATE TRIGGER auth_sessions_updated_at BEFORE UPDATE ON auth_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE auth_rate_limits (
  key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  count integer NOT NULL CHECK (count > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_rate_limits_expiry ON auth_rate_limits (expires_at);
CREATE TRIGGER auth_rate_limits_updated_at BEFORE UPDATE ON auth_rate_limits FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- migrate:down

DROP TABLE auth_rate_limits;
DROP TABLE auth_sessions;
DROP TABLE email_challenges;
DROP TABLE users;
