import type { PoolClient } from 'pg'
import type { DirectoryItem, DirectoryList, DirectoryQuery } from '@refs-tools/contracts/organization-self'
import type { PageQuery, Paged } from '@refs-tools/contracts/pagination'
import type {
  ApplicantProfile, MineRow, NewOrganizationApplication, OrganizationSelfRepository,
} from './organization-access.types.js'

type MineSqlRow = {
  id: string; name: string; region: string; purpose: string; status: MineRow['status']; owner_user_id: string
  created_at: Date; governance_reason: string | null; membership_id: string | null
  membership_status: 'pending' | 'active' | null; membership_version: number | null
}
type DirectorySqlRow = { id: string; name: string; region: string; purpose: string; member_count: string; relation: DirectoryItem['relation'] }

function mapMine(row: MineSqlRow): MineRow {
  return { id: row.id, name: row.name, region: row.region, purpose: row.purpose, status: row.status, ownerUserId: row.owner_user_id,
    createdAt: row.created_at.toISOString(), governanceReason: row.governance_reason,
    membership: row.membership_id && row.membership_status && row.membership_version
      ? { id: row.membership_id, status: row.membership_status, version: row.membership_version } : null }
}

/** 用户视角的组织读写；所有值参数化，只投影目录与本人关系所需的最小字段。 */
export class PgOrganizationSelfRepository implements OrganizationSelfRepository {
  constructor(private readonly connection: Pick<PoolClient, 'query'>) {}

  async mine(userId: string, query: PageQuery): Promise<Paged<MineRow>> {
    const page = Number(query.page ?? '1'), pageSize = Number(query.pageSize ?? '100')
    // 并集：本人当前 pending/active 成员关系，加上本人作为负责人但尚无成员关系的待审核/被驳回申请。
    const from = `FROM organizations o LEFT JOIN organization_memberships m
      ON m.organization_id=o.id AND m.user_id=$1 AND m.status IN ('pending','active')`
    const where = `WHERE m.id IS NOT NULL OR (o.owner_user_id=$1 AND o.status IN ('pending_review','rejected'))`
    const count = await this.connection.query<{ total: string }>(`SELECT count(*) AS total ${from} ${where}`, [userId])
    const rows = await this.connection.query<MineSqlRow>(`SELECT o.id,o.name,o.region,o.purpose,o.status,o.owner_user_id,o.created_at,
        o.governance_reason,m.id AS membership_id,m.status AS membership_status,m.version AS membership_version
      ${from} ${where}
      ORDER BY o.created_at DESC,o.id DESC LIMIT $2 OFFSET $3`, [userId, pageSize, (page - 1) * pageSize])
    return { items: rows.rows.map(mapMine), total: Number(count.rows[0]!.total), page, pageSize }
  }

  async directory(userId: string, query: DirectoryQuery): Promise<DirectoryList> {
    const page = Number(query.page ?? '1'), pageSize = Number(query.pageSize ?? '20')
    const keyword = (query.keyword ?? '').trim().toLowerCase()
    const filter = `o.status='active' AND ($1='' OR strpos(lower(o.name),$1)>0 OR strpos(lower(o.region),$1)>0)`
    const count = await this.connection.query<{ total: string }>(`SELECT count(*) AS total FROM organizations o WHERE ${filter}`, [keyword])
    const rows = await this.connection.query<DirectorySqlRow>(`SELECT o.id,o.name,o.region,o.purpose,
        (SELECT count(*) FROM organization_memberships c WHERE c.organization_id=o.id AND c.status='active') AS member_count,
        COALESCE((SELECT m.status FROM organization_memberships m WHERE m.organization_id=o.id AND m.user_id=$2
          AND m.status IN ('pending','active')),'none') AS relation
      FROM organizations o WHERE ${filter} ORDER BY o.created_at DESC,o.id DESC LIMIT $3 OFFSET $4`,
    [keyword, userId, pageSize, (page - 1) * pageSize])
    return { items: rows.rows.map(row => ({ id: row.id, name: row.name, region: row.region, purpose: row.purpose,
      memberCount: Number(row.member_count), relation: row.relation })), total: Number(count.rows[0]!.total), page, pageSize }
  }

  async lockApplicant(userId: string): Promise<void> {
    await this.connection.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`organization-application:${userId}`])
  }

  async countPending(userId: string): Promise<number> {
    const result = await this.connection.query<{ total: string }>(
      `SELECT count(*) AS total FROM organizations WHERE owner_user_id=$1 AND status='pending_review'`, [userId])
    return Number(result.rows[0]!.total)
  }

  async applicantProfile(userId: string): Promise<ApplicantProfile | null> {
    // 跨模块只读投影 referee_profiles：资料的写入与校验仍归 profiles 模块，这里只取申请快照所需的两列。
    const result = await this.connection.query<{ legal_name: string | null; phone_e164: string | null }>(
      `SELECT p.legal_name,p.phone_e164 FROM users u LEFT JOIN referee_profiles p ON p.user_id=u.id
       WHERE u.id=$1 AND u.status='active' AND u.deleted_at IS NULL`, [userId])
    const row = result.rows[0]
    return row ? { legalName: row.legal_name, phone: row.phone_e164 } : null
  }

  async apply(id: string, ownerUserId: string, input: NewOrganizationApplication, now: Date): Promise<void> {
    await this.connection.query(`INSERT INTO organizations(id,name,region,purpose,owner_user_id,owner_legal_name,contact,status,created_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,'pending_review',$8)`,
    [id, input.name, input.region, input.purpose, ownerUserId, input.ownerLegalName, input.contact, now])
  }
}
