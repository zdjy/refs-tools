import type { PoolClient } from 'pg'
import type { MemberContact, MemberListQuery, MemberPageQuery, Membership, OrganizationInvitation } from '@refs-tools/contracts/organization-members'
import type { OrganizationMembersRepository } from './organization-members.types.js'

type MemberRow = { id: string; organization_id: string; user_id: string; display_name: string;
  status: Membership['status']; version: number; created_at: Date }
type InviteRow = Omit<MemberRow, 'status'> & { status: OrganizationInvitation['status']; organization_name: string; expires_at: Date }
type ContactRow = { display_name: string; legal_name: string | null; phone_e164: string | null;
  region_label: string | null; avatar_media_id: string | null }
const memberColumns = 'm.id,m.organization_id,m.user_id,u.display_name,m.status,m.version,m.created_at'
const inviteColumns = `i.id,i.organization_id,i.user_id,u.display_name,i.version,i.created_at,i.expires_at,o.name AS organization_name,
  CASE WHEN i.status='pending' AND i.expires_at <= $1 THEN 'expired' ELSE i.status END AS status`
const mapMember = (row: MemberRow): Membership => ({ id: row.id, organizationId: row.organization_id, userId: row.user_id,
  displayName: row.display_name, status: row.status, version: row.version, createdAt: row.created_at.toISOString() })
const mapInvite = (row: InviteRow): OrganizationInvitation => ({ ...mapMember({ ...row, status: 'pending' }),
  status: row.status, organizationName: row.organization_name, expiresAt: row.expires_at.toISOString() })
const pagination = (query: MemberPageQuery) => ({ page: Number(query.page ?? 1), pageSize: Number(query.pageSize ?? 20) })
/** 成员与邀请持久化由组织模块拥有；调用方先锁组织以串行化入会和成员变更。 */
export class PgOrganizationMembersRepository implements OrganizationMembersRepository {
  constructor(private readonly connection: Pick<PoolClient, 'query'>) {}

  async members(id: string, query: MemberListQuery, activeOnly: boolean) {
    const { page, pageSize } = pagination(query)
    // 关键词只按昵称子串过滤，计数与取页共用同一条件，因此筛选后的分页总数与页数一致。
    const keyword = (query.keyword ?? '').trim().toLowerCase()
    const from = `FROM organization_memberships m JOIN users u ON u.id=m.user_id
      WHERE m.organization_id=$1 AND ($2='' OR strpos(lower(u.display_name),$2)>0)
      AND (NOT $3::boolean OR m.status='active')`
    const count = await this.connection.query<{ total: string }>(`SELECT count(*) AS total ${from}`, [id, keyword, activeOnly])
    const rows = await this.connection.query<MemberRow>(`SELECT ${memberColumns} ${from}
      ORDER BY m.created_at DESC,m.id DESC LIMIT $4 OFFSET $5`, [id, keyword, activeOnly, pageSize, (page - 1) * pageSize])
    return { items: rows.rows.map(mapMember), total: Number(count.rows[0]!.total), page, pageSize }
  }

  async invitations(filter: { organizationId?: string; userId?: string }, query: MemberPageQuery, now: Date) {
    const { page, pageSize } = pagination(query), values = [filter.organizationId ?? null, filter.userId ?? null]
    const count = await this.connection.query<{ total: string }>(`SELECT count(*) AS total FROM organization_invitations
      WHERE ($1::uuid IS NULL OR organization_id=$1) AND ($2::uuid IS NULL OR user_id=$2)`, values)
    const rows = await this.connection.query<InviteRow>(`SELECT ${inviteColumns} FROM organization_invitations i
      JOIN users u ON u.id=i.user_id JOIN organizations o ON o.id=i.organization_id
      WHERE ($2::uuid IS NULL OR i.organization_id=$2) AND ($3::uuid IS NULL OR i.user_id=$3)
      ORDER BY i.created_at DESC,i.id DESC LIMIT $4 OFFSET $5`, [now, ...values, pageSize, (page - 1) * pageSize])
    return { items: rows.rows.map(mapInvite), total: Number(count.rows[0]!.total), page, pageSize }
  }

  async membership(organizationId: string, id: string) {
    const rows = await this.connection.query<MemberRow>(`SELECT ${memberColumns} FROM organization_memberships m JOIN users u ON u.id=m.user_id
      WHERE m.organization_id=$1 AND m.id=$2 FOR UPDATE OF m`, [organizationId, id])
    return rows.rows[0] ? mapMember(rows.rows[0]) : null
  }

  async memberContact(organizationId: string, id: string) {
    // 跨模块只读投影 users 与 referee_profiles：档案写入仍归 profiles 模块，这里只取联络用途所需字段。
    const rows = await this.connection.query<ContactRow>(`SELECT u.display_name,p.legal_name,p.phone_e164,p.region_label,p.avatar_media_id
      FROM organization_memberships m JOIN users u ON u.id=m.user_id
      LEFT JOIN referee_profiles p ON p.user_id=m.user_id
      WHERE m.organization_id=$1 AND m.id=$2`, [organizationId, id])
    const row = rows.rows[0]
    return row ? { nickname: row.display_name, legalName: row.legal_name, phone: row.phone_e164,
      regionLabel: row.region_label, avatarMediaId: row.avatar_media_id } : null
  }

  async current(organizationId: string, userId: string) {
    const rows = await this.connection.query<MemberRow>(`SELECT ${memberColumns} FROM organization_memberships m JOIN users u ON u.id=m.user_id
      WHERE m.organization_id=$1 AND m.user_id=$2 AND m.status IN ('pending','active') FOR UPDATE OF m`, [organizationId, userId])
    return rows.rows[0] ? mapMember(rows.rows[0]) : null
  }

  async join(id: string, organizationId: string, userId: string, status: 'pending' | 'active') {
    // pending → active 保留申请身份；已离开的历史关系不复用，避免恢复旧权限。
    const rows = await this.connection.query<{ id: string }>(`INSERT INTO organization_memberships(id,organization_id,user_id,status)
      VALUES($1,$2,$3,$4) ON CONFLICT (organization_id,user_id) WHERE status IN ('pending','active')
      DO UPDATE SET status=EXCLUDED.status,version=organization_memberships.version+1 RETURNING id`, [id, organizationId, userId, status])
    return (await this.membership(organizationId, rows.rows[0]!.id))!
  }

  async changeMember(id: string, version: number, status: Membership['status']) {
    const result = await this.connection.query(`UPDATE organization_memberships SET status=$3,version=version+1 WHERE id=$1 AND version=$2 RETURNING id`, [id, version, status])
    return result.rows.length > 0
  }

  async invitation(organizationId: string, id: string, now: Date) {
    const rows = await this.connection.query<InviteRow>(`SELECT ${inviteColumns} FROM organization_invitations i JOIN users u ON u.id=i.user_id
      JOIN organizations o ON o.id=i.organization_id WHERE i.organization_id=$2 AND i.id=$3 FOR UPDATE OF i`, [now, organizationId, id])
    return rows.rows[0] ? mapInvite(rows.rows[0]) : null
  }

  async createInvitation(id: string, organizationId: string, userId: string, actor: string, now: Date, expires: Date) {
    await this.connection.query(`UPDATE organization_invitations SET status='expired',version=version+1
      WHERE organization_id=$1 AND user_id=$2 AND status='pending' AND expires_at <= $3`, [organizationId, userId, now])
    const result = await this.connection.query(`INSERT INTO organization_invitations(id,organization_id,user_id,created_by,created_at,expires_at)
      VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT (organization_id,user_id) WHERE status='pending' DO NOTHING RETURNING id`, [id, organizationId, userId, actor, now, expires])
    return result.rows.length > 0
  }

  async changeInvitation(id: string, version: number, status: OrganizationInvitation['status']) {
    const result = await this.connection.query(`UPDATE organization_invitations SET status=$3,version=version+1 WHERE id=$1 AND version=$2 RETURNING id`, [id, version, status])
    return result.rows.length > 0
  }
}
