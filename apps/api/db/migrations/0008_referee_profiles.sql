-- migrate:up

-- 认证身份（users）与裁判档案（referee_profiles）分表：实名、联系方式与生日不参与认证判定。
CREATE TABLE referee_profiles (
  user_id uuid PRIMARY KEY REFERENCES users (id),
  legal_name text CHECK (legal_name IS NULL OR length(btrim(legal_name)) BETWEEN 1 AND 40),
  phone_e164 text CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  region_code text CHECK (region_code IS NULL OR region_code ~ '^[0-9]{6}$'),
  region_label text CHECK (region_label IS NULL OR length(btrim(region_label)) BETWEEN 1 AND 120),
  address_detail text CHECK (address_detail IS NULL OR length(btrim(address_detail)) BETWEEN 1 AND 200),
  birth_date date CHECK (birth_date IS NULL OR birth_date >= DATE '1900-01-01'),
  avatar_media_id uuid REFERENCES media_objects (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- 代码与展示快照必须同时存在，避免出现只能聚合不能展示或反之的半成品状态。
  CONSTRAINT referee_profiles_region_pair CHECK ((region_code IS NULL) = (region_label IS NULL))
);
CREATE TRIGGER referee_profiles_updated_at BEFORE UPDATE ON referee_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE email_challenges DROP CONSTRAINT email_challenges_purpose_check;
ALTER TABLE email_challenges ADD CONSTRAINT email_challenges_purpose_check
  CHECK (purpose IN ('register', 'login', 'password', 'email_change'));

ALTER TABLE media_objects DROP CONSTRAINT media_objects_purpose_check;
ALTER TABLE media_objects ADD CONSTRAINT media_objects_purpose_check
  CHECK (purpose IN ('learning', 'certification_evidence', 'exam_answer', 'forum_attachment', 'post_game_record', 'avatar'));

-- migrate:down

ALTER TABLE media_objects DROP CONSTRAINT media_objects_purpose_check;
ALTER TABLE media_objects ADD CONSTRAINT media_objects_purpose_check
  CHECK (purpose IN ('learning', 'certification_evidence', 'exam_answer', 'forum_attachment', 'post_game_record'));

ALTER TABLE email_challenges DROP CONSTRAINT email_challenges_purpose_check;
ALTER TABLE email_challenges ADD CONSTRAINT email_challenges_purpose_check
  CHECK (purpose IN ('register', 'login', 'password'));

DROP TABLE referee_profiles;
