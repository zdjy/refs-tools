import type { PoolClient } from 'pg'
import type { AdminMedia, AdminMediaQuery } from '@refs-tools/contracts/admin-media'
import type { AdminMediaRepository } from './media.types.js'

type Row = {
  id: string; owner_user_id: string; purpose: AdminMedia['purpose']; status: AdminMedia['status']
  original_file_name: string | null; target_type: AdminMedia['target']['type']; target_id: string | null
  declared_content_type: string; expected_size_bytes: string; verified_size_bytes: string | null
  created_at: Date; expires_at: Date; verified_at: Date | null; deleted_at: Date | null; cleaned_at: Date | null
}
const columns = 'id,owner_user_id,purpose,status,original_file_name,target_type,target_id,declared_content_type,expected_size_bytes,verified_size_bytes,created_at,expires_at,verified_at,deleted_at,cleaned_at'
function map(row: Row): AdminMedia {
  return { id: row.id, ownerUserId: row.owner_user_id, purpose: row.purpose, status: row.status,
    fileName: row.original_file_name, target: { type: row.target_type, id: row.target_id },
    contentType: row.declared_content_type, expectedSizeBytes: Number(row.expected_size_bytes),
    verifiedSizeBytes: row.verified_size_bytes === null ? null : Number(row.verified_size_bytes),
    createdAt: row.created_at.toISOString(), expiresAt: row.expires_at.toISOString(),
    verifiedAt: row.verified_at?.toISOString() ?? null, deletedAt: row.deleted_at?.toISOString() ?? null, cleanedAt: row.cleaned_at?.toISOString() ?? null }
}

/** 媒体模块的管理只读投影，不读取存储地址或用户个人资料。 */
export class PgAdminMediaRepository implements AdminMediaRepository {
  constructor(private readonly connection: Pick<PoolClient, 'query'>) {}

  async list(query: AdminMediaQuery) {
    const values = [query.keyword?.trim() ?? '', query.ownerUserId ?? null, query.purpose ?? null, query.status ?? null]
    // strpos 按字面搜索，避免把文件名中的 %/_ 当成 SQL 通配符；查询为有界管理分页。
    const where = `WHERE ($1='' OR strpos(lower(COALESCE(original_file_name,'')),lower($1))>0)
      AND ($2::uuid IS NULL OR owner_user_id=$2) AND ($3::text IS NULL OR purpose=$3) AND ($4::text IS NULL OR status=$4)`
    const count = await this.connection.query<{ total: string }>(`SELECT count(*) AS total FROM media_objects ${where}`, values)
    const page = Number(query.page ?? '1')
    const result = await this.connection.query<Row>(`SELECT ${columns} FROM media_objects ${where}
      ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET $5`, [...values, (page - 1) * 20])
    return { items: result.rows.map(map), total: Number(count.rows[0]!.total), page, pageSize: 20 as const }
  }

  async detail(id: string) {
    const result = await this.connection.query<Row>(`SELECT ${columns} FROM media_objects WHERE id=$1`, [id])
    return result.rows[0] ? map(result.rows[0]) : null
  }
}
