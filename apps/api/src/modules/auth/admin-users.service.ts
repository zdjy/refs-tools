import { randomUUID } from 'node:crypto'
import type { AdminUser, AdminUserQuery, CreateAdminUser, UpdateAdminUser } from '@refs-tools/contracts/admin-users'
import { DomainError } from '../../application/errors.js'
import { requirePermission } from '../authorization/authorization.service.js'
import { appendAudit } from '../audit/audit.service.js'
import type { AdminUsersDependencies, AdminUsersRepositories } from './admin-users.types.js'

async function authorize(repositories: AdminUsersRepositories, actor: string, now: Date, dependencies: AdminUsersDependencies) {
  if (!await repositories.users.requireActiveActor(actor)) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
  await requirePermission(repositories.authorization, { subjectUserId: actor, permission: 'platform.manage',
    resource: { type: 'platform', id: null } }, now, dependencies.permissions)
}
function requireName(value: string): string {
  const name = value.trim()
  if (!name) throw new DomainError('INVALID_NAME', '请输入显示名称', 422)
  return name
}
async function record(repositories: AdminUsersRepositories, actor: string, id: string,
  action: 'user.queried' | 'user.created' | 'user.updated' | 'user.deleted', now: Date,
  before: AdminUser | null = null, after: AdminUser | null = null) {
  await appendAudit(repositories.audit, { actorUserId: actor, action, resourceType: 'user', resourceId: id,
    scopeType: 'platform', scopeId: null, organizationId: null, reason: null,
    before: before ? { status: before.status, version: before.version } : null,
    after: after ? { status: after.status, version: after.version } : action === 'user.deleted' ? { status: 'deleted' } : null }, now)
}
async function target(repositories: AdminUsersRepositories, id: string, now: Date): Promise<AdminUser> {
  const user = await repositories.users.find(id, now, true)
  if (!user) throw new DomainError('NOT_FOUND', '用户不存在', 404)
  return user
}

/** 平台账号用例；身份变更、会话撤销与安全审计共用一条事务连接。 */
export class AdminUsersService {
  constructor(private readonly dependencies: AdminUsersDependencies) {}

  async checkAccess(actor: string): Promise<void> {
    await this.dependencies.transaction.run((repositories) => authorize(repositories, actor, this.dependencies.now(), this.dependencies))
  }

  async list(actor: string, query: AdminUserQuery) {
    const now = this.dependencies.now()
    return this.dependencies.transaction.run(async (repositories) => {
      await authorize(repositories, actor, now, this.dependencies)
      const result = await repositories.users.list(query, now)
      await record(repositories, actor, actor, 'user.queried', now)
      return result
    })
  }

  async detail(actor: string, id: string) {
    const now = this.dependencies.now()
    return this.dependencies.transaction.run(async (repositories) => {
      await authorize(repositories, actor, now, this.dependencies)
      const user = await repositories.users.find(id, now)
      if (!user) throw new DomainError('NOT_FOUND', '用户不存在', 404)
      await record(repositories, actor, id, 'user.queried', now)
      return user
    })
  }

  async create(actor: string, input: CreateAdminUser) {
    const displayName = requireName(input.displayName)
    if (input.password.length < this.dependencies.passwordMinLength) {
      throw new DomainError('WEAK_PASSWORD', `密码至少需要 ${this.dependencies.passwordMinLength} 个字符`, 422)
    }
    await this.dependencies.transaction.run((repositories) => authorize(repositories, actor, this.dependencies.now(), this.dependencies))
    // KDF 在事务外执行，避免占用连接和授权行锁；写入前重新核验权限。
    const passwordHash = await this.dependencies.hashPassword(input.password)
    const now = this.dependencies.now(), id = randomUUID()
    return this.dependencies.transaction.run(async (repositories) => {
      await authorize(repositories, actor, now, this.dependencies)
      if (!await repositories.users.create({ id, email: input.email.trim().toLowerCase(), displayName, passwordHash }, now)) {
        throw new DomainError('EMAIL_ALREADY_BOUND', '邮箱已被使用', 409)
      }
      const user = await target(repositories, id, now)
      await record(repositories, actor, id, 'user.created', now, null, user)
      return user
    })
  }

  async update(actor: string, id: string, input: UpdateAdminUser) {
    const displayName = requireName(input.displayName), now = this.dependencies.now()
    return this.dependencies.transaction.run(async (repositories) => {
      await authorize(repositories, actor, now, this.dependencies)
      const before = await this.editable(repositories, actor, id, input.version, input.status === 'disabled', now)
      if (!await repositories.users.update(id, { ...input, displayName })) throw this.conflict()
      if (input.status === 'disabled') await repositories.sessions.revokeUserSessions(id, now)
      const after = await target(repositories, id, now)
      await record(repositories, actor, id, 'user.updated', now, before, after)
      return after
    })
  }

  async remove(actor: string, id: string, version: number) {
    const now = this.dependencies.now()
    return this.dependencies.transaction.run(async (repositories) => {
      await authorize(repositories, actor, now, this.dependencies)
      const before = await this.editable(repositories, actor, id, version, true, now)
      if (!await repositories.users.remove(id, version, now)) throw this.conflict()
      await repositories.sessions.revokeUserSessions(id, now)
      await record(repositories, actor, id, 'user.deleted', now, before)
      return { deleted: true as const }
    })
  }

  private async editable(repositories: AdminUsersRepositories, actor: string, id: string, version: number, disabling: boolean, now: Date) {
    if (actor === id) throw new DomainError('SELF_MANAGEMENT_DENIED', '请在个人设置中维护自己的账号', 409)
    const user = await target(repositories, id, now)
    if (user.version !== version) throw this.conflict()
    if (disabling && await repositories.users.isProtected(id, now)) {
      throw new DomainError('PROTECTED_ACCOUNT', '请先移交组织所有权或撤销平台管理员角色', 409)
    }
    return user
  }

  private conflict() { return new DomainError('VERSION_CONFLICT', '用户已被其他操作更新，请重新读取后再提交', 409) }
}
