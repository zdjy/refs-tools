import type { PoolClient } from 'pg'
import type { Candidate, OrganizationRole } from '@refs-tools/contracts/organization-access'
import type { OrganizationCandidatesRepository, OrganizationRolesRepository } from './organization-access.types.js'

type RoleRow = { id: string; subject_user_id: string; display_name: string; role: OrganizationRole['role']; starts_at: Date }
type CandidateRow = { id: string; display_name: string; relation: Candidate['relation'] }

/** 组织范围角色读取；只含 owner/organizer/certifier，赛事/比赛范围的裁判长属于后续选派模块。 */
export class PgOrganizationRolesRepository implements OrganizationRolesRepository {
  constructor(private readonly connection: Pick<PoolClient, 'query'>) {}

  async list(organizationId: string, now: Date): Promise<OrganizationRole[]> {
    const rows = await this.connection.query<RoleRow>(`SELECT b.id,b.subject_user_id,u.display_name,b.role,b.starts_at
      FROM role_bindings b JOIN users u ON u.id=b.subject_user_id
      WHERE b.scope_type='organization' AND b.scope_id=$1 AND b.role IN ('owner','organizer','certifier')
        AND b.revoked_at IS NULL AND b.starts_at <= $2 AND (b.expires_at IS NULL OR b.expires_at > $2)
      ORDER BY CASE b.role WHEN 'owner' THEN 0 WHEN 'organizer' THEN 1 ELSE 2 END,b.starts_at,b.id`, [organizationId, now])
    return rows.rows.map(row => ({ id: row.id, userId: row.subject_user_id, displayName: row.display_name,
      role: row.role, grantedAt: row.starts_at.toISOString() }))
  }
}

/**
 * 邀请候选人检索，是对身份表的只读跨模块投影：仅返回有效且邮箱已验证账号的昵称与 ID 尾号。
 * 含 `@` 的关键词只做精确邮箱匹配；其余做昵称子串匹配并限制 10 条，降低账号枚举面。
 */
export class PgOrganizationCandidatesRepository implements OrganizationCandidatesRepository {
  constructor(private readonly connection: Pick<PoolClient, 'query'>) {}

  async search(organizationId: string, actorId: string, keyword: string, now: Date): Promise<Candidate[]> {
    const rows = await this.connection.query<CandidateRow>(`SELECT u.id,u.display_name,
        CASE WHEN EXISTS (SELECT 1 FROM organization_memberships m WHERE m.organization_id=$1 AND m.user_id=u.id AND m.status='active') THEN 'active'
             WHEN EXISTS (SELECT 1 FROM organization_memberships m WHERE m.organization_id=$1 AND m.user_id=u.id AND m.status='pending') THEN 'pending'
             WHEN EXISTS (SELECT 1 FROM organization_invitations i WHERE i.organization_id=$1 AND i.user_id=u.id AND i.status='pending' AND i.expires_at > $4) THEN 'invited'
             ELSE 'none' END AS relation
      FROM users u WHERE u.status='active' AND u.deleted_at IS NULL AND u.email_verified_at IS NOT NULL AND u.id<>$2
        AND (CASE WHEN strpos($3,'@')>0 THEN u.email=$3 ELSE strpos(lower(u.display_name),$3)>0 END)
      ORDER BY u.display_name,u.id LIMIT 10`, [organizationId, actorId, keyword, now])
    return rows.rows.map(row => ({ userId: row.id, displayName: row.display_name, tag: row.id.slice(-4), relation: row.relation }))
  }
}
