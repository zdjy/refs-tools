import type { PoolClient } from 'pg'
import type { ScopedRoleBinding } from '@refs-tools/contracts/authorization'
import type { ResourceScope } from '@refs-tools/domain'
import type { AuthorizationRepository, ResourceReference } from './authorization.types.js'

type BindingRow = {
  id: string; subject_user_id: string; role: ScopedRoleBinding['role']; scope_type: ScopedRoleBinding['scopeType']
  scope_id: string | null; granted_by: string; starts_at: Date; expires_at: Date | null; revoked_at: Date | null
}
type ScopeRow = {
  organization_id: string; event_id: string | null; match_id: string | null
  owner_user_id: string; organization_status: ResourceScope['organizationStatus']; state: string
}
const bindingColumns = 'id, subject_user_id, role, scope_type, scope_id, granted_by, starts_at, expires_at, revoked_at'
function mapBinding(row: BindingRow): ScopedRoleBinding {
  return { id: row.id, subjectUserId: row.subject_user_id, role: row.role, scopeType: row.scope_type,
    scopeId: row.scope_id, grantedBy: row.granted_by, startsAt: row.starts_at.toISOString(),
    expiresAt: row.expires_at?.toISOString() ?? null, revokedAt: row.revoked_at?.toISOString() ?? null }
}
// SQL 标识符只由服务端白名单选择，归属永远沿数据库外键解析，不接收调用者声明的父级 ID。
const scopeQueries = {
  organization: `SELECT o.id AS organization_id, NULL::uuid AS event_id, NULL::uuid AS match_id,
    o.owner_user_id, o.status AS organization_status, o.status AS state FROM organizations o WHERE o.id=$1 FOR SHARE OF o`,
  event: `SELECT o.id AS organization_id, e.id AS event_id, NULL::uuid AS match_id,
    o.owner_user_id, o.status AS organization_status, e.status AS state
    FROM events e JOIN organizations o ON o.id=e.organization_id WHERE e.id=$1 FOR SHARE OF e,o`,
  match: `SELECT o.id AS organization_id, e.id AS event_id, m.id AS match_id,
    o.owner_user_id, o.status AS organization_status,
    CASE WHEN e.status IN ('completed','cancelled') THEN e.status ELSE m.status END AS state
    FROM matches m JOIN events e ON e.id=m.event_id JOIN organizations o ON o.id=e.organization_id
    WHERE m.id=$1 FOR SHARE OF m,e,o`,
} as const

/** 授权只读归属投影及角色持久化；写用例须使用事务连接，行锁防止授权依据在提交前被撤销。 */
export class PgAuthorizationRepository implements AuthorizationRepository {
  constructor(private readonly connection: Pick<PoolClient, 'query'>) {}

  async findBindings(subjectUserId: string): Promise<ScopedRoleBinding[]> {
    const result = await this.connection.query<BindingRow>(
      `SELECT ${bindingColumns} FROM role_bindings WHERE subject_user_id=$1 AND revoked_at IS NULL ORDER BY id FOR SHARE`, [subjectUserId])
    return result.rows.map(mapBinding)
  }

  async resolveScope(reference: ResourceReference): Promise<ResourceScope | null> {
    if (reference.type === 'platform') return reference.id === null ? this.baseline('platform', null) : null
    if (!reference.id) return null
    if (reference.type === 'self') {
      const result = await this.connection.query('SELECT id FROM users WHERE id=$1 AND status=\'active\' FOR SHARE', [reference.id])
      return result.rows.length ? { ...this.baseline('self', reference.id), ownerUserId: reference.id } : null
    }
    const result = await this.connection.query<ScopeRow>(scopeQueries[reference.type], [reference.id])
    const row = result.rows[0]
    return row ? { type: reference.type, id: reference.id, organizationId: row.organization_id,
      eventId: row.event_id, matchId: row.match_id, ownerUserId: row.owner_user_id,
      organizationStatus: row.organization_status, state: row.state } : null
  }

  async isActiveMember(subjectUserId: string, organizationId: string): Promise<boolean> {
    const result = await this.connection.query(`SELECT id FROM organization_memberships
      WHERE user_id=$1 AND organization_id=$2 AND status='active' FOR SHARE`, [subjectUserId, organizationId])
    return result.rows.length > 0
  }

  async insertBinding(binding: ScopedRoleBinding): Promise<boolean> {
    const result = await this.connection.query(`INSERT INTO role_bindings
      (id,subject_user_id,role,scope_type,scope_id,granted_by,starts_at,expires_at,revoked_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (subject_user_id,role,scope_type,scope_id) WHERE revoked_at IS NULL DO NOTHING RETURNING id`,
    [binding.id, binding.subjectUserId, binding.role, binding.scopeType, binding.scopeId,
      binding.grantedBy, binding.startsAt, binding.expiresAt, binding.revokedAt])
    return result.rows.length > 0
  }

  async findBinding(id: string): Promise<ScopedRoleBinding | null> {
    const result = await this.connection.query<BindingRow>(`SELECT ${bindingColumns} FROM role_bindings WHERE id=$1 FOR UPDATE`, [id])
    return result.rows[0] ? mapBinding(result.rows[0]) : null
  }

  async revokeBinding(id: string, now: string): Promise<boolean> {
    const result = await this.connection.query('UPDATE role_bindings SET revoked_at=$2 WHERE id=$1 AND revoked_at IS NULL RETURNING id', [id, now])
    return result.rows.length > 0
  }

  private baseline(type: 'self' | 'platform', id: string | null): ResourceScope {
    return { type, id, organizationId: null, eventId: null, matchId: null, ownerUserId: null, organizationStatus: null, state: null }
  }
}
