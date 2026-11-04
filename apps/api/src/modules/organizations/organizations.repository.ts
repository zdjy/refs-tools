import type { PoolClient } from 'pg'
import type { CreateOrganization, OrganizationDetail, OrganizationList, OrganizationQuery } from '@refs-tools/contracts/organizations'
import type { OrganizationsRepository } from './organizations.types.js'

type OrganizationRow = {
  id: string; name: string; region: string; purpose: string; owner_user_id: string; status: OrganizationDetail['status']
  created_at: Date; version: number; owner_legal_name: string; contact: string; reviewed_by: string | null
  reviewed_at: Date | null; governance_reason: string | null
}
const summaryColumns = 'id,name,region,purpose,owner_user_id,status,created_at,version'
const detailColumns = `${summaryColumns},owner_legal_name,contact,reviewed_by,reviewed_at,governance_reason`
function summary(row: OrganizationRow) {
  return { id: row.id, name: row.name, region: row.region, purpose: row.purpose, ownerUserId: row.owner_user_id,
    status: row.status, createdAt: row.created_at.toISOString(), version: row.version }
}
function detail(row: OrganizationRow): OrganizationDetail {
  return { ...summary(row), ownerLegalName: row.owner_legal_name, contact: row.contact, reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at?.toISOString() ?? null, governanceReason: row.governance_reason }
}

/** 组织拥有组织资料与成员表；列表仅投影治理所需字段。 */
export class PgOrganizationsRepository implements OrganizationsRepository {
  constructor(private readonly connection: Pick<PoolClient, 'query'>) {}

  async list(query: OrganizationQuery): Promise<OrganizationList> {
    const page = Number(query.page ?? '1'), pageSize = Number(query.pageSize ?? '20')
    const filter = `($1::text IS NULL OR status=$1) AND ($2='' OR strpos(lower(name),$2)>0 OR strpos(lower(region),$2)>0)`
    const values = [query.status ?? null, (query.keyword ?? '').trim().toLowerCase()]
    const count = await this.connection.query<{ total: string }>(`SELECT count(*) AS total FROM organizations WHERE ${filter}`, values)
    const rows = await this.connection.query<OrganizationRow>(`SELECT ${summaryColumns} FROM organizations WHERE ${filter}
      ORDER BY created_at DESC,id DESC LIMIT $3 OFFSET $4`, [...values, pageSize, (page - 1) * pageSize])
    return { items: rows.rows.map(summary), total: Number(count.rows[0]!.total), page, pageSize }
  }

  async find(id: string, lock = false): Promise<OrganizationDetail | null> {
    const result = await this.connection.query<OrganizationRow>(`SELECT ${detailColumns} FROM organizations WHERE id=$1 ${lock ? 'FOR UPDATE' : ''}`, [id])
    return result.rows[0] ? detail(result.rows[0]) : null
  }

  async create(id: string, input: CreateOrganization, now: Date): Promise<void> {
    await this.connection.query(`INSERT INTO organizations(id,name,region,purpose,owner_user_id,owner_legal_name,contact,status,created_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,'pending_review',$8)`,
    [id, input.name, input.region, input.purpose, input.ownerUserId, input.ownerLegalName, input.contact, now])
  }

  async changeStatus(id: string, version: number, status: OrganizationDetail['status'], actor: string, reason: string, review: boolean, now: Date): Promise<boolean> {
    const result = await this.connection.query(`UPDATE organizations SET status=$3,version=version+1,governance_reason=$5,
      reviewed_by=CASE WHEN $6 THEN $4::uuid ELSE reviewed_by END,
      reviewed_at=CASE WHEN $6 THEN $7::timestamptz ELSE reviewed_at END WHERE id=$1 AND version=$2 RETURNING id`,
    [id, version, status, actor, reason, review, now])
    return result.rows.length > 0
  }

  async activateOwnerMembership(id: string, organizationId: string, userId: string): Promise<void> {
    // 当前 pending/active 唯一索引使审批重复请求不会建立两份当前关系，历史关系保留。
    await this.connection.query(`INSERT INTO organization_memberships(id,organization_id,user_id,status) VALUES($1,$2,$3,'active')
      ON CONFLICT (organization_id,user_id) WHERE status IN ('pending','active') DO UPDATE SET status='active'`, [id, organizationId, userId])
  }
}
