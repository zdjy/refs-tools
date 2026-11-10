import type { PoolClient } from 'pg'
import { CANDIDATE_PAGE_SIZE, type Candidate, type OrganizationRole } from '@refs-tools/contracts/organization-access'
import type { PageQuery, Paged } from '@refs-tools/contracts/pagination'
import type { OrganizationCandidatesRepository, OrganizationRolesRepository } from './organization-access.types.js'

type RoleRow = { id: string; subject_user_id: string; display_name: string; role: OrganizationRole['role']; starts_at: Date }
type CandidateRow = { id: string; display_name: string; relation: Candidate['relation'] }
const roleColumns = 'b.id,b.subject_user_id,u.display_name,b.role,b.starts_at'
const roleFrom = `FROM role_bindings b JOIN users u ON u.id=b.subject_user_id`
/** 有效绑定条件固定一处，列表与单条读取共用，避免分页与详情判定不一致。 */
const activeRoles = `b.scope_type='organization' AND b.role IN ('owner','organizer','certifier')
  AND b.revoked_at IS NULL AND b.starts_at <= $2 AND (b.expires_at IS NULL OR b.expires_at > $2)`
const roleOrder = `CASE b.role WHEN 'owner' THEN 0 WHEN 'organizer' THEN 1 ELSE 2 END,b.starts_at,b.id`
const mapRole = (row: RoleRow): OrganizationRole => ({ id: row.id, userId: row.subject_user_id, displayName: row.display_name,
  role: row.role, grantedAt: row.starts_at.toISOString() })

/** 组织范围角色读取；只含 owner/organizer/certifier，赛事/比赛范围的裁判长属于后续选派模块。 */
export class PgOrganizationRolesRepository implements OrganizationRolesRepository {
  constructor(private readonly connection: Pick<PoolClient, 'query'>) {}

  async list(organizationId: string, query: PageQuery, now: Date): Promise<Paged<OrganizationRole>> {
    const page = Number(query.page ?? '1'), pageSize = Number(query.pageSize ?? '100')
    const count = await this.connection.query<{ total: string }>(
      `SELECT count(*) AS total ${roleFrom} WHERE b.scope_id=$1 AND ${activeRoles}`, [organizationId, now])
    const rows = await this.connection.query<RoleRow>(`SELECT ${roleColumns} ${roleFrom}
      WHERE b.scope_id=$1 AND ${activeRoles} ORDER BY ${roleOrder} LIMIT $3 OFFSET $4`,
    [organizationId, now, pageSize, (page - 1) * pageSize])
    return { items: rows.rows.map(mapRole), total: Number(count.rows[0]!.total), page, pageSize }
  }

  async find(organizationId: string, bindingId: string, now: Date): Promise<OrganizationRole | null> {
    const rows = await this.connection.query<RoleRow>(`SELECT ${roleColumns} ${roleFrom}
      WHERE b.scope_id=$1 AND b.id=$3 AND ${activeRoles}`, [organizationId, now, bindingId])
    return rows.rows[0] ? mapRole(rows.rows[0]) : null
  }
}

/**
 * 邀请候选人检索，是对身份表的只读跨模块投影：仅返回有效且邮箱已验证账号的昵称与 ID 尾号。
 * 含 `@` 的关键词只做精确邮箱匹配；其余做昵称或实名子串匹配。实名只参与匹配，不进入响应或审计。
 * 页大小固定为 10 条且只接受 page，使分页不会放大账号枚举面。
 */
export class PgOrganizationCandidatesRepository implements OrganizationCandidatesRepository {
  constructor(private readonly connection: Pick<PoolClient, 'query'>) {}

  async search(organizationId: string, actorId: string, keyword: string, page: number, now: Date): Promise<Paged<Candidate>> {
    // 同一个匹配条件要同时用于计数与取页，占位符编号随两条 SQL 的参数位置不同，故用函数生成。
    const match = (actor: string, word: string) => `u.status='active' AND u.deleted_at IS NULL AND u.email_verified_at IS NOT NULL AND u.id<>${actor}
      AND (CASE WHEN strpos(${word},'@')>0 THEN u.email=${word}
        ELSE strpos(lower(u.display_name),${word})>0
          OR strpos(lower(COALESCE((SELECT p.legal_name FROM referee_profiles p WHERE p.user_id=u.id),'')),${word})>0 END)`
    const count = await this.connection.query<{ total: string }>(`SELECT count(*) AS total FROM users u WHERE ${match('$1', '$2')}`, [actorId, keyword])
    const rows = await this.connection.query<CandidateRow>(`SELECT u.id,u.display_name,
        CASE WHEN EXISTS (SELECT 1 FROM organization_memberships m WHERE m.organization_id=$1 AND m.user_id=u.id AND m.status='active') THEN 'active'
             WHEN EXISTS (SELECT 1 FROM organization_memberships m WHERE m.organization_id=$1 AND m.user_id=u.id AND m.status='pending') THEN 'pending'
             WHEN EXISTS (SELECT 1 FROM organization_invitations i WHERE i.organization_id=$1 AND i.user_id=u.id AND i.status='pending' AND i.expires_at > $4) THEN 'invited'
             ELSE 'none' END AS relation
      FROM users u WHERE ${match('$2', '$3')} ORDER BY u.display_name,u.id LIMIT $5 OFFSET $6`,
    [organizationId, actorId, keyword, now, CANDIDATE_PAGE_SIZE, (page - 1) * CANDIDATE_PAGE_SIZE])
    return { items: rows.rows.map(row => ({ userId: row.id, displayName: row.display_name, tag: row.id.slice(-4), relation: row.relation })),
      total: Number(count.rows[0]!.total), page, pageSize: CANDIDATE_PAGE_SIZE }
  }
}
