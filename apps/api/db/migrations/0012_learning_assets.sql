-- migrate:up
CREATE TABLE learning_categories (
  id uuid PRIMARY KEY, parent_id uuid REFERENCES learning_categories(id),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  slug text NOT NULL UNIQUE CHECK (length(slug)<=100 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  depth smallint NOT NULL CHECK (depth BETWEEN 1 AND 3),
  status text NOT NULL CHECK (status IN ('active','disabled')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision>0), created_by uuid NOT NULL REFERENCES users(id),
  idempotency_key text NOT NULL, request_fingerprint text NOT NULL, UNIQUE(created_by,idempotency_key),
  CHECK (parent_id IS DISTINCT FROM id), CHECK ((parent_id IS NULL)=(depth=1))
);
-- 所有分类变更共享事务锁；触发器也覆盖直接 SQL，避免并发移动绕过深度/环检查。
CREATE FUNCTION validate_learning_category() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_depth integer;
BEGIN
  PERFORM pg_advisory_xact_lock(912012);
  IF NEW.parent_id IS NOT NULL THEN
    SELECT depth INTO parent_depth FROM learning_categories WHERE id=NEW.parent_id;
    IF parent_depth IS NULL OR NEW.depth<>parent_depth+1 THEN RAISE EXCEPTION 'invalid category depth' USING ERRCODE='23514'; END IF;
    IF EXISTS (WITH RECURSIVE ancestors AS (
      SELECT id,parent_id FROM learning_categories WHERE id=NEW.parent_id
      UNION ALL SELECT c.id,c.parent_id FROM learning_categories c JOIN ancestors a ON c.id=a.parent_id
    ) SELECT 1 FROM ancestors WHERE id=NEW.id) THEN RAISE EXCEPTION 'category cycle' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER learning_category_validate BEFORE INSERT OR UPDATE ON learning_categories FOR EACH ROW EXECUTE FUNCTION validate_learning_category();
CREATE FUNCTION validate_learning_tree() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM learning_categories c JOIN learning_categories p ON c.parent_id=p.id WHERE c.depth<>p.depth+1)
    THEN RAISE EXCEPTION 'invalid descendant depth' USING ERRCODE='23514'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER learning_tree_validate AFTER INSERT OR UPDATE ON learning_categories
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_learning_tree();
CREATE TABLE learning_assets (
  id uuid PRIMARY KEY, status text NOT NULL CHECK (status IN ('draft','published','unpublished')),
  revision integer NOT NULL CHECK (revision>0), latest_version integer NOT NULL CHECK (latest_version>0),
  published_version integer, created_by uuid NOT NULL REFERENCES users(id),
  idempotency_key text NOT NULL, request_fingerprint text NOT NULL,
  UNIQUE(created_by,idempotency_key),
  CHECK (published_version IS NULL OR published_version BETWEEN 1 AND latest_version),
  CHECK (status<>'published' OR published_version IS NOT NULL)
);
CREATE TABLE learning_asset_versions (
  asset_id uuid NOT NULL REFERENCES learning_assets(id), version integer NOT NULL CHECK (version>0),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200), summary text NOT NULL CHECK (length(summary)<=1000),
  body jsonb NOT NULL CHECK (jsonb_typeof(body)='array' AND jsonb_array_length(body)<=100),
  category_ids uuid[] NOT NULL CHECK (cardinality(category_ids)<=20), media_ids uuid[] NOT NULL CHECK (cardinality(media_ids)<=20),
  allow_download boolean NOT NULL, created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL,
  PRIMARY KEY(asset_id,version)
);
ALTER TABLE learning_assets ADD CONSTRAINT learning_published_version_fk FOREIGN KEY(id,published_version)
  REFERENCES learning_asset_versions(asset_id,version) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE learning_assets ADD CONSTRAINT learning_latest_version_fk FOREIGN KEY(id,latest_version)
  REFERENCES learning_asset_versions(asset_id,version) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE learning_publications (
  asset_id uuid NOT NULL, asset_version integer NOT NULL, revision integer NOT NULL CHECK (revision>0),
  published_by uuid NOT NULL REFERENCES users(id), published_at timestamptz NOT NULL,
  PRIMARY KEY(asset_id,revision), FOREIGN KEY(asset_id,asset_version) REFERENCES learning_asset_versions(asset_id,version)
);
CREATE TRIGGER learning_publications_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON learning_publications
  FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_mutation();
CREATE TABLE learning_asset_categories (
  asset_id uuid NOT NULL, asset_version integer NOT NULL, category_id uuid NOT NULL REFERENCES learning_categories(id),
  PRIMARY KEY(asset_id,asset_version,category_id), FOREIGN KEY(asset_id,asset_version) REFERENCES learning_asset_versions(asset_id,version)
);
CREATE TABLE learning_asset_media (
  asset_id uuid NOT NULL, asset_version integer NOT NULL, media_id uuid NOT NULL REFERENCES media_objects(id),
  PRIMARY KEY(asset_id,asset_version,media_id), FOREIGN KEY(asset_id,asset_version) REFERENCES learning_asset_versions(asset_id,version)
);
-- 引用表只能插入不可变快照已声明的 ID；既有快照不能事后追加新的引用。
CREATE FUNCTION validate_learning_reference() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE valid boolean;
BEGIN
  IF TG_TABLE_NAME='learning_asset_media' THEN
    SELECT NEW.media_id=ANY(media_ids) INTO valid FROM learning_asset_versions WHERE asset_id=NEW.asset_id AND version=NEW.asset_version;
    PERFORM id FROM media_objects WHERE id=NEW.media_id AND status='available' AND purpose='learning' AND target_type='platform' AND target_id IS NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'unavailable learning media' USING ERRCODE='23514'; END IF;
  ELSE
    SELECT NEW.category_id=ANY(category_ids) INTO valid FROM learning_asset_versions WHERE asset_id=NEW.asset_id AND version=NEW.asset_version;
  END IF;
  IF valid IS DISTINCT FROM true THEN RAISE EXCEPTION 'reference outside snapshot' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER learning_media_validate BEFORE INSERT ON learning_asset_media FOR EACH ROW EXECUTE FUNCTION validate_learning_reference();
CREATE TRIGGER learning_reference_validate BEFORE INSERT ON learning_asset_categories FOR EACH ROW EXECUTE FUNCTION validate_learning_reference();
CREATE FUNCTION retain_learning_media() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP='DELETE' OR (to_jsonb(NEW)-'cleaned_at') IS DISTINCT FROM (to_jsonb(OLD)-'cleaned_at')) AND EXISTS (
    SELECT 1 FROM learning_asset_media WHERE media_id=OLD.id) THEN
    RAISE EXCEPTION 'learning media retained' USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER learning_media_retention BEFORE UPDATE OR DELETE ON media_objects FOR EACH ROW EXECUTE FUNCTION retain_learning_media();
CREATE INDEX learning_category_assets ON learning_asset_categories(category_id,asset_id,asset_version);
CREATE INDEX learning_media_references ON learning_asset_media(media_id);
CREATE INDEX learning_published_assets ON learning_assets(status,id);
CREATE TRIGGER learning_versions_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON learning_asset_versions
  FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_mutation();
CREATE TRIGGER learning_categories_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON learning_asset_categories
  FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_mutation();
CREATE TRIGGER learning_media_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON learning_asset_media
  FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_mutation();

-- migrate:down
DROP TRIGGER learning_media_retention ON media_objects;
DROP FUNCTION retain_learning_media();
DROP TABLE learning_asset_media,learning_asset_categories;
DROP FUNCTION validate_learning_reference();
ALTER TABLE learning_assets DROP CONSTRAINT learning_published_version_fk, DROP CONSTRAINT learning_latest_version_fk;
DROP TABLE learning_publications,learning_asset_versions,learning_assets,learning_categories;
DROP FUNCTION validate_learning_category(),validate_learning_tree();
