-- migrate:up

-- 后续业务迁移复用此触发器函数；本任务不提前建立身份或业务表。
CREATE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- migrate:down

DROP FUNCTION set_updated_at();
