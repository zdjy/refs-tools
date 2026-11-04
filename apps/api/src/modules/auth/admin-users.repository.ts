import type { PoolClient } from 'pg'
import type { AdminUser, AdminUserList, AdminUserQuery, UpdateAdminUser } from '@refs-tools/contracts/admin-users'
import type { AdminUsersRepository } from './admin-users.types.js'

type UserRow = {
  id: string; email: string; display_name: string; email_verified_at: Date | null
  status: AdminUser['status']; created_at: Date; version: number; roles: AdminUser['roles']
}
const columns = `u.id,u.email,u.display_name,u.email_verified_at,u.status,u.created_at,u.version,
  ARRAY(SELECT b.role FROM role_bindings b WHERE b.subject_user_id=u.id AND b.scope_type='platform'
    AND b.revoked_at IS NULL AND b.starts_at <= $1 AND (b.expires_at IS NULL OR b.expires_at > $1) ORDER BY b.role) AS roles`
function mapUser(row: UserRow): AdminUser {
  return { id: row.id, email: row.email, displayName: row.display_name, emailVerified: row.email_verified_at !== null,
    status: row.status, createdAt: row.created_at.toISOString(), version: row.version, roles: row.roles }
}

/** 身份模块管理投影；所有查询值参数化，返回值不包含密码或会话。 */
export class PgAdminUsersRepository implements AdminUsersRepository {
  constructor(private readonly connection: Pick<PoolClient, 'query'>) {}

  async requireActiveActor(id: string): Promise<boolean> {
    const result = await this.connection.query(`SELECT id FROM users WHERE id=$1 AND status='active'
      AND deleted_at IS NULL AND email_verified_at IS NOT NULL FOR SHARE`, [id])
    return result.rows.length > 0
  }

  async list(query: AdminUserQuery, now: Date): Promise<AdminUserList> {
    const page = Number(query.page ?? '1'), pageSize = Number(query.pageSize ?? '20')
    const filter = `u.deleted_at IS NULL AND ($1::text IS NULL OR u.status=$1)
      AND ($2='' OR strpos(lower(u.email),$2)>0 OR strpos(lower(u.display_name),$2)>0)`
    const filterValues = [query.status ?? null, (query.keyword ?? '').trim().toLowerCase()]
    const count = await this.connection.query<{ total: string }>(`SELECT count(*) AS total FROM users u WHERE ${filter}`,
      filterValues)
    const rowsFilter = `u.deleted_at IS NULL AND ($2::text IS NULL OR u.status=$2)
      AND ($3='' OR strpos(lower(u.email),$3)>0 OR strpos(lower(u.display_name),$3)>0)`
    const rows = await this.connection.query<UserRow>(`SELECT ${columns} FROM users u WHERE ${rowsFilter}
      ORDER BY u.created_at DESC,u.id DESC LIMIT $4 OFFSET $5`, [now, ...filterValues, pageSize, (page - 1) * pageSize])
    return { items: rows.rows.map(mapUser), total: Number(count.rows[0]!.total), page, pageSize }
  }

  async find(id: string, now: Date, lock = false): Promise<AdminUser | null> {
    const result = await this.connection.query<UserRow>(`SELECT ${columns} FROM users u
      WHERE u.id=$2 AND u.deleted_at IS NULL ${lock ? 'FOR UPDATE OF u' : ''}`, [now, id])
    return result.rows[0] ? mapUser(result.rows[0]) : null
  }

  async create(input: { id: string; email: string; displayName: string; passwordHash: string }, now: Date): Promise<boolean> {
    const result = await this.connection.query(`INSERT INTO users (id,email,display_name,password_hash,created_at)
      VALUES ($1,$2,$3,$4,$5) ON CONFLICT ON CONSTRAINT users_email_unique DO NOTHING RETURNING id`,
    [input.id, input.email, input.displayName, input.passwordHash, now])
    return result.rows.length > 0
  }

  async update(id: string, input: UpdateAdminUser): Promise<boolean> {
    const result = await this.connection.query(`UPDATE users SET display_name=$2,status=$3,version=version+1
      WHERE id=$1 AND version=$4 AND deleted_at IS NULL RETURNING id`, [id, input.displayName, input.status, input.version])
    return result.rows.length > 0
  }

  async remove(id: string, version: number, now: Date): Promise<boolean> {
    const result = await this.connection.query(`UPDATE users SET status='disabled',deleted_at=$3,version=version+1
      WHERE id=$1 AND version=$2 AND deleted_at IS NULL RETURNING id`, [id, version, now])
    return result.rows.length > 0
  }

  async isProtected(id: string, now: Date): Promise<boolean> {
    const owner = await this.connection.query(`SELECT id FROM organizations WHERE owner_user_id=$1 LIMIT 1 FOR SHARE`, [id])
    if (owner.rows.length > 0) return true
    const platformAdmin = await this.connection.query(`SELECT id FROM role_bindings WHERE subject_user_id=$1 AND role='platform_admin'
      AND revoked_at IS NULL AND starts_at <= $2 AND (expires_at IS NULL OR expires_at > $2) LIMIT 1 FOR SHARE`, [id, now])
    return platformAdmin.rows.length > 0
  }
}
