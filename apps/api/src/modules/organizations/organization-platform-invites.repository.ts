import type { PoolClient } from 'pg'
import type { Paged } from '@refs-tools/contracts/pagination'
import type { PlatformInvite, PlatformInviteQuery } from '@refs-tools/contracts/platform-invites'
import { platformInviteStatus } from '@refs-tools/domain'
import type { ConsumedPlatformInvite, NewPlatformInvite, PlatformInvitesRepository } from './organization-platform-invites.types.js'

type InviteRow = {
  id: string; hint: string; version: number; created_at: Date; expires_at: Date; revoked_at: Date | null
  used_at: Date | null; used_organization_id: string | null
}
const columns = 'id,hint,version,created_at,expires_at,revoked_at,used_at,used_organization_id'
// 与领域函数 platformInviteStatus 同一优先级：已使用 > 已撤销 > 已过期 > active，用于按状态筛选。
const statusSql = `CASE WHEN used_at IS NOT NULL THEN 'used' WHEN revoked_at IS NOT NULL THEN 'revoked'
  WHEN expires_at <= $1 THEN 'expired' ELSE 'active' END`
const mapInvite = (row: InviteRow, now: Date): PlatformInvite => ({ id: row.id, hint: row.hint, version: row.version,
  createdAt: row.created_at.toISOString(), expiresAt: row.expires_at.toISOString(),
  usedOrganizationId: row.used_organization_id, usedAt: row.used_at?.toISOString() ?? null,
  status: platformInviteStatus({ usedAt: row.used_at, revokedAt: row.revoked_at, expiresAt: row.expires_at }, now) })

/** 平台创建邀请码持久化由组织模块拥有；只存哈希，查询绝不返回哈希或明文。 */
export class PgPlatformInvitesRepository implements PlatformInvitesRepository {
  constructor(private readonly connection: Pick<PoolClient, 'query'>) {}

  async list(query: PlatformInviteQuery, now: Date): Promise<Paged<PlatformInvite>> {
    const page = Number(query.page ?? '1'), pageSize = Number(query.pageSize ?? '20')
    const filter = `($2::text IS NULL OR ${statusSql} = $2)`
    const values = [now, query.status ?? null]
    const count = await this.connection.query<{ total: string }>(
      `SELECT count(*) AS total FROM platform_organization_invites WHERE ${filter}`, values)
    const rows = await this.connection.query<InviteRow>(`SELECT ${columns} FROM platform_organization_invites WHERE ${filter}
      ORDER BY created_at DESC,id DESC LIMIT $3 OFFSET $4`, [...values, pageSize, (page - 1) * pageSize])
    return { items: rows.rows.map(row => mapInvite(row, now)), total: Number(count.rows[0]!.total), page, pageSize }
  }

  async create(input: NewPlatformInvite, now: Date, expires: Date): Promise<void> {
    await this.connection.query(`INSERT INTO platform_organization_invites(id,token_hash,hint,created_by,created_at,expires_at)
      VALUES($1,$2,$3,$4,$5,$6)`, [input.id, input.tokenHash, input.hint, input.createdBy, now, expires])
  }

  async find(id: string, now: Date): Promise<PlatformInvite | null> {
    const rows = await this.connection.query<InviteRow>(
      `SELECT ${columns} FROM platform_organization_invites WHERE id=$1 FOR UPDATE`, [id])
    return rows.rows[0] ? mapInvite(rows.rows[0], now) : null
  }

  async revoke(id: string, version: number, now: Date): Promise<boolean> {
    const result = await this.connection.query(`UPDATE platform_organization_invites SET revoked_at=$3,version=version+1
      WHERE id=$1 AND version=$2 AND used_at IS NULL AND revoked_at IS NULL RETURNING id`, [id, version, now])
    return result.rows.length > 0
  }

  async consume(tokenHash: string, userId: string, organizationId: string, now: Date): Promise<ConsumedPlatformInvite | null> {
    // 并发兑换同一枚码时，后到的事务在行锁释放后重新评估条件，used_at 已写入因而命中 0 行。
    const rows = await this.connection.query<{ id: string; created_by: string; version: number }>(
      `UPDATE platform_organization_invites SET used_at=$3,used_by=$2,used_organization_id=$4,version=version+1
       WHERE token_hash=$1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > $3
       RETURNING id,created_by,version`, [tokenHash, userId, now, organizationId])
    const row = rows.rows[0]
    return row ? { id: row.id, createdBy: row.created_by, version: row.version } : null
  }
}
