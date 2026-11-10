import type { PoolClient } from 'pg'
import type { AdminMedia, AdminMediaQuery } from '@refs-tools/contracts/admin-media'
import type { AdminMediaRepository } from './media.types.js'

type Row = {
  id: string; owner_user_id: string; owner_display_name: string | null; purpose: AdminMedia['purpose']; status: AdminMedia['status']
  original_file_name: string | null; target_type: AdminMedia['target']['type']; target_id: string | null
  declared_content_type: string; expected_size_bytes: string; verified_size_bytes: string | null
  created_at: Date; expires_at: Date; verified_at: Date | null; deleted_at: Date | null; cleaned_at: Date | null
}
const columns = `m.id,m.owner_user_id,u.display_name AS owner_display_name,m.purpose,m.status,m.original_file_name,m.target_type,m.target_id,m.declared_content_type,m.expected_size_bytes,m.verified_size_bytes,m.created_at,m.expires_at,m.verified_at,m.deleted_at,m.cleaned_at`
/** 归属账号只读联表，用于展示昵称与按昵称/实名检索；不外泄邮箱、实名或联系方式。 */
const from = `FROM media_objects m
  LEFT JOIN users u ON u.id=m.owner_user_id
  LEFT JOIN referee_profiles p ON p.user_id=m.owner_user_id`
function map(row: Row): AdminMedia {
  return { id: row.id, ownerUserId: row.owner_user_id, ownerDisplayName: row.owner_display_name,
    purpose: row.purpose, status: row.status,
    fileName: row.original_file_name, target: { type: row.target_type, id: row.target_id },
    contentType: row.declared_content_type, expectedSizeBytes: Number(row.expected_size_bytes),
    verifiedSizeBytes: row.verified_size_bytes === null ? null : Number(row.verified_size_bytes),
    createdAt: row.created_at.toISOString(), expiresAt: row.expires_at.toISOString(),
    verifiedAt: row.verified_at?.toISOString() ?? null, deletedAt: row.deleted_at?.toISOString() ?? null, cleanedAt: row.cleaned_at?.toISOString() ?? null }
}

/** 媒体模块的管理只读投影：不读取存储地址；归属账号只联表昵称用于展示与按昵称/实名检索。 */
export class PgAdminMediaRepository implements AdminMediaRepository {
  constructor(private readonly connection: Pick<PoolClient, 'query'>) {}

  async list(query: AdminMediaQuery) {
    const values = [query.keyword?.trim() ?? '', query.ownerKeyword?.trim() ?? '', query.purpose ?? null, query.status ?? null]
    // strpos 按字面搜索，避免把文件名或昵称中的 %/_ 当成 SQL 通配符；查询为有界管理分页。
    const where = `WHERE ($1='' OR strpos(lower(COALESCE(m.original_file_name,'')),lower($1))>0)
      AND ($2='' OR strpos(lower(COALESCE(u.display_name,'')),lower($2))>0
        OR strpos(lower(COALESCE(p.legal_name,'')),lower($2))>0)
      AND ($3::text IS NULL OR m.purpose=$3) AND ($4::text IS NULL OR m.status=$4)`
    const count = await this.connection.query<{ total: string }>(`SELECT count(*) AS total ${from} ${where}`, values)
    const page = Number(query.page ?? '1')
    const result = await this.connection.query<Row>(`SELECT ${columns} ${from} ${where}
      ORDER BY m.created_at DESC,m.id DESC LIMIT 20 OFFSET $5`, [...values, (page - 1) * 20])
    return { items: result.rows.map(map), total: Number(count.rows[0]!.total), page, pageSize: 20 as const }
  }

  async detail(id: string) {
    const result = await this.connection.query<Row>(`SELECT ${columns} ${from} WHERE m.id=$1`, [id])
    return result.rows[0] ? map(result.rows[0]) : null
  }
}
