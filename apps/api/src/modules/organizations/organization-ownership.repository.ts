import type { PoolClient } from 'pg'
import type { PageQuery, Paged } from '@refs-tools/contracts/pagination'
import type { OwnershipTransfer } from '@refs-tools/contracts/organization-ownership'
import { ownershipTransferStatus } from '@refs-tools/domain'
import type { NewOwnershipTransfer, OrganizationOwnershipRepository, TransferChange } from './organization-ownership.types.js'

type TransferRow = {
  id: string; organization_id: string; organization_name: string; from_user_id: string; from_name: string
  to_user_id: string; to_name: string; status: OwnershipTransfer['status']; version: number
  created_at: Date; expires_at: Date; decided_at: Date | null
}
// 跨模块只读联表 organizations 与 users：仅取组织名与昵称，不取邮箱、联系方式或实名。
const select = `SELECT t.id,t.organization_id,o.name AS organization_name,t.from_user_id,f.display_name AS from_name,
  t.to_user_id,r.display_name AS to_name,t.status,t.version,t.created_at,t.expires_at,t.decided_at`
const from = `FROM organization_ownership_transfers t JOIN organizations o ON o.id=t.organization_id
  JOIN users f ON f.id=t.from_user_id JOIN users r ON r.id=t.to_user_id`
const mapTransfer = (row: TransferRow, now: Date): OwnershipTransfer => ({ id: row.id, organizationId: row.organization_id,
  organizationName: row.organization_name, fromUserId: row.from_user_id, fromDisplayName: row.from_name,
  toUserId: row.to_user_id, toDisplayName: row.to_name, version: row.version, createdAt: row.created_at.toISOString(),
  expiresAt: row.expires_at.toISOString(), decidedAt: row.decided_at?.toISOString() ?? null,
  status: ownershipTransferStatus({ status: row.status, expiresAt: row.expires_at }, now) })

/** 所有权移交请求持久化由组织模块拥有；稳定排序为 `created_at DESC, id DESC`。 */
export class PgOrganizationOwnershipRepository implements OrganizationOwnershipRepository {
  constructor(private readonly connection: Pick<PoolClient, 'query'>) {}

  private async page(where: string, values: unknown[], query: PageQuery, now: Date): Promise<Paged<OwnershipTransfer>> {
    const page = Number(query.page ?? '1'), pageSize = Number(query.pageSize ?? '20')
    const count = await this.connection.query<{ total: string }>(`SELECT count(*) AS total ${from} WHERE ${where}`, values)
    const rows = await this.connection.query<TransferRow>(`${select} ${from} WHERE ${where}
      ORDER BY t.created_at DESC,t.id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, pageSize, (page - 1) * pageSize])
    return { items: rows.rows.map(row => mapTransfer(row, now)), total: Number(count.rows[0]!.total), page, pageSize }
  }

  listByOrganization(organizationId: string, query: PageQuery, now: Date) {
    return this.page('t.organization_id=$1', [organizationId], query, now)
  }

  incoming(userId: string, query: PageQuery, now: Date) {
    // 收件箱只展示仍可处理的请求：已到期的 pending 不再出现。
    return this.page(`t.to_user_id=$1 AND t.status='pending' AND t.expires_at > $2`, [userId, now], query, now)
  }

  async find(organizationId: string, id: string, now: Date): Promise<OwnershipTransfer | null> {
    const rows = await this.connection.query<TransferRow>(`${select} ${from}
      WHERE t.organization_id=$1 AND t.id=$2 FOR UPDATE OF t`, [organizationId, id])
    return rows.rows[0] ? mapTransfer(rows.rows[0], now) : null
  }

  async create(input: NewOwnershipTransfer, now: Date, expires: Date): Promise<boolean> {
    // 部分唯一索引保证同一组织只有一个 pending；冲突时不插入，由调用方转为业务冲突。
    const result = await this.connection.query(`INSERT INTO organization_ownership_transfers
      (id,organization_id,from_user_id,to_user_id,created_at,expires_at) VALUES($1,$2,$3,$4,$5,$6)
      ON CONFLICT (organization_id) WHERE status='pending' DO NOTHING RETURNING id`,
    [input.id, input.organizationId, input.fromUserId, input.toUserId, now, expires])
    return result.rows.length > 0
  }

  async decide(id: string, version: number, status: 'accepted' | 'declined' | 'cancelled', now: Date): Promise<boolean> {
    const result = await this.connection.query(`UPDATE organization_ownership_transfers SET status=$3,decided_at=$4,version=version+1
      WHERE id=$1 AND version=$2 AND status='pending' AND expires_at > $4 RETURNING id`, [id, version, status, now])
    return result.rows.length > 0
  }

  async expireStale(organizationId: string, now: Date): Promise<TransferChange[]> {
    return this.settle(`status='pending' AND expires_at <= $2`, 'expired', organizationId, now)
  }

  async supersedePending(organizationId: string, now: Date): Promise<TransferChange[]> {
    return this.settle(`status='pending'`, 'superseded', organizationId, now)
  }

  private async settle(where: string, status: 'expired' | 'superseded', organizationId: string, now: Date): Promise<TransferChange[]> {
    const rows = await this.connection.query<{ id: string; version: number }>(`UPDATE organization_ownership_transfers
      SET status='${status}',decided_at=$2,version=version+1 WHERE organization_id=$1 AND ${where} RETURNING id,version`,
    [organizationId, now])
    return rows.rows
  }
}
