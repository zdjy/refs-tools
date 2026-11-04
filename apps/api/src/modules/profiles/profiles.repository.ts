import type { PoolClient } from 'pg'
import type { Profile } from '@refs-tools/contracts/profile'
import type { ProfilesRepository, ProfileWrite } from './profiles.types.js'

type ProfileRow = {
  id: string; display_name: string; version: number
  legal_name: string | null; phone_e164: string | null; region_code: string | null; region_label: string | null
  address_detail: string | null; birth_date: string | null; avatar_media_id: string | null
}
// birth_date 用 to_char 取文本，避免驱动把 DATE 解析为带时区的 JS Date。
const columns = `u.id,u.display_name,u.version,p.legal_name,p.phone_e164,p.region_code,p.region_label,
  p.address_detail,to_char(p.birth_date,'YYYY-MM-DD') AS birth_date,p.avatar_media_id`

function map(row: ProfileRow): Profile {
  return { userId: row.id, nickname: row.display_name, legalName: row.legal_name, phone: row.phone_e164,
    regionCode: row.region_code, regionLabel: row.region_label, addressDetail: row.address_detail,
    birthDate: row.birth_date, avatarMediaId: row.avatar_media_id, version: row.version }
}

/** 档案聚合由 profiles 模块拥有；昵称仍写在 users，档案字段写入 referee_profiles。 */
export class PgProfilesRepository implements ProfilesRepository {
  constructor(private readonly connection: Pick<PoolClient, 'query'>) {}

  async find(userId: string, lock: boolean): Promise<Profile | null> {
    const result = await this.connection.query<ProfileRow>(`SELECT ${columns} FROM users u
      LEFT JOIN referee_profiles p ON p.user_id=u.id
      WHERE u.id=$1 AND u.status='active' AND u.deleted_at IS NULL ${lock ? 'FOR UPDATE OF u' : ''}`, [userId])
    return result.rows[0] ? map(result.rows[0]) : null
  }

  async save(userId: string, expectedVersion: number, next: ProfileWrite): Promise<boolean> {
    const updated = await this.connection.query(`UPDATE users SET display_name=$2,version=version+1
      WHERE id=$1 AND version=$3 AND deleted_at IS NULL RETURNING id`, [userId, next.nickname, expectedVersion])
    if (updated.rows.length === 0) return false
    await this.connection.query(`INSERT INTO referee_profiles
      (user_id,legal_name,phone_e164,region_code,region_label,address_detail,birth_date,avatar_media_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (user_id) DO UPDATE SET legal_name=EXCLUDED.legal_name,phone_e164=EXCLUDED.phone_e164,
        region_code=EXCLUDED.region_code,region_label=EXCLUDED.region_label,address_detail=EXCLUDED.address_detail,
        birth_date=EXCLUDED.birth_date,avatar_media_id=EXCLUDED.avatar_media_id`,
    [userId, next.legalName, next.phone, next.regionCode, next.regionLabel, next.addressDetail, next.birthDate, next.avatarMediaId])
    return true
  }

  async ownedAvatar(userId: string, mediaId: string): Promise<boolean> {
    // 跨模块只读投影 media_objects：只判断归属、用途与核验状态，不复制媒体写路径。
    const result = await this.connection.query(`SELECT id FROM media_objects
      WHERE id=$1 AND owner_user_id=$2 AND purpose='avatar' AND status='available'`, [mediaId, userId])
    return result.rows.length > 0
  }
}
