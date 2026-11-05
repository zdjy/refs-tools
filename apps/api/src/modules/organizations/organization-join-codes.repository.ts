import type { PoolClient } from 'pg'
import type { JoinCode } from '@refs-tools/contracts/organization-access'
import { joinCodeStatus } from '@refs-tools/domain'
import type { NewJoinCode, OrganizationJoinCodesRepository } from './organization-access.types.js'

type CodeRow = { id: string; hint: string; max_uses: number; uses: number; version: number; created_at: Date; expires_at: Date; revoked_at: Date | null }
const columns = 'id,hint,max_uses,uses,version,created_at,expires_at,revoked_at'
const mapCode = (row: CodeRow, now: Date): JoinCode => ({ id: row.id, hint: row.hint, maxUses: row.max_uses, uses: row.uses,
  version: row.version, createdAt: row.created_at.toISOString(), expiresAt: row.expires_at.toISOString(),
  status: joinCodeStatus({ revokedAt: row.revoked_at, expiresAt: row.expires_at, uses: row.uses, maxUses: row.max_uses }, now) })

/** 成员码持久化由组织模块拥有；只存哈希，查询绝不返回哈希或明文。 */
export class PgOrganizationJoinCodesRepository implements OrganizationJoinCodesRepository {
  constructor(private readonly connection: Pick<PoolClient, 'query'>) {}

  async list(organizationId: string, now: Date): Promise<JoinCode[]> {
    const rows = await this.connection.query<CodeRow>(`SELECT ${columns} FROM organization_join_codes WHERE organization_id=$1
      ORDER BY created_at DESC,id DESC LIMIT 50`, [organizationId])
    return rows.rows.map(row => mapCode(row, now))
  }

  async countActive(organizationId: string, now: Date): Promise<number> {
    const result = await this.connection.query<{ total: string }>(`SELECT count(*) AS total FROM organization_join_codes
      WHERE organization_id=$1 AND revoked_at IS NULL AND expires_at > $2 AND uses < max_uses`, [organizationId, now])
    return Number(result.rows[0]!.total)
  }

  async create(input: NewJoinCode, now: Date, expires: Date): Promise<void> {
    await this.connection.query(`INSERT INTO organization_join_codes(id,organization_id,token_hash,hint,max_uses,created_by,created_at,expires_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [input.id, input.organizationId, input.tokenHash, input.hint, input.maxUses, input.createdBy, now, expires])
  }

  async find(organizationId: string, id: string, now: Date): Promise<JoinCode | null> {
    const rows = await this.connection.query<CodeRow>(`SELECT ${columns} FROM organization_join_codes
      WHERE organization_id=$1 AND id=$2 FOR UPDATE`, [organizationId, id])
    return rows.rows[0] ? mapCode(rows.rows[0], now) : null
  }

  async organizationOf(tokenHash: string): Promise<string | null> {
    const rows = await this.connection.query<{ organization_id: string }>(
      'SELECT organization_id FROM organization_join_codes WHERE token_hash=$1', [tokenHash])
    return rows.rows[0]?.organization_id ?? null
  }

  async consume(tokenHash: string, organizationId: string, now: Date): Promise<JoinCode | null> {
    // 条件与 CHECK 双重兜底：并发消费同一枚码时，超出次数的更新不会命中任何行。
    const rows = await this.connection.query<CodeRow>(`UPDATE organization_join_codes SET uses=uses+1
      WHERE token_hash=$1 AND organization_id=$2 AND revoked_at IS NULL AND expires_at > $3 AND uses < max_uses
      RETURNING ${columns}`, [tokenHash, organizationId, now])
    return rows.rows[0] ? mapCode(rows.rows[0], now) : null
  }

  async revoke(id: string, version: number, now: Date): Promise<boolean> {
    const result = await this.connection.query(`UPDATE organization_join_codes SET revoked_at=$3,version=version+1
      WHERE id=$1 AND version=$2 AND revoked_at IS NULL RETURNING id`, [id, version, now])
    return result.rows.length > 0
  }
}
