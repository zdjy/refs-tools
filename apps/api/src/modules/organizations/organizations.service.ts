import { randomUUID } from 'node:crypto'
import type { CreateOrganization, OrganizationDecision, OrganizationDetail, OrganizationQuery } from '@refs-tools/contracts/organizations'
import type { AuditAction } from '@refs-tools/contracts/audit'
import { organizationStatusAfter } from '@refs-tools/domain'
import { DomainError } from '../../application/errors.js'
import { requirePermission } from '../authorization/authorization.service.js'
import { appendAudit } from '../audit/audit.service.js'
import type { OrganizationsDependencies, OrganizationsRepositories } from './organizations.types.js'

function conflict() { return new DomainError('VERSION_CONFLICT', '组织已更新，请重新读取后再操作', 409) }
async function target(repositories: OrganizationsRepositories, id: string, lock = false) {
  const result = await repositories.organizations.find(id, lock)
  if (!result) throw new DomainError('NOT_FOUND', '组织不存在', 404)
  return result
}
async function record(repositories: OrganizationsRepositories, actor: string, id: string, action: AuditAction,
  now: Date, before: OrganizationDetail | null = null, after: OrganizationDetail | null = null, reason: string | null = null) {
  const snapshot = (value: OrganizationDetail) => ({ status: value.status, version: value.version, subjectUserId: value.ownerUserId })
  await appendAudit(repositories.audit, { actorUserId: actor, action, resourceType: 'organization', resourceId: id,
    scopeType: 'platform', scopeId: null, organizationId: null, reason,
    before: before ? snapshot(before) : null, after: after ? snapshot(after) : null }, now)
}

/** 平台治理用例；实时授权、状态变更、首次成员/角色与审计共用事务。 */
export class OrganizationsService {
  constructor(private readonly dependencies: OrganizationsDependencies) {}

  async list(actor: string, query: OrganizationQuery) {
    const now = this.dependencies.now()
    return this.dependencies.transaction.run(async (repositories) => {
      await this.authorize(repositories, actor, now)
      const result = await repositories.organizations.list(query)
      await record(repositories, actor, actor, 'organization.queried', now)
      return result
    })
  }

  async detail(actor: string, id: string) {
    const now = this.dependencies.now()
    return this.dependencies.transaction.run(async (repositories) => {
      await this.authorize(repositories, actor, now)
      const result = await target(repositories, id)
      await record(repositories, actor, id, 'organization.queried', now)
      return result
    })
  }

  async create(actor: string, input: CreateOrganization) {
    const normalized = { ...input, name: input.name.trim(), region: input.region.trim(), purpose: input.purpose.trim(),
      ownerLegalName: input.ownerLegalName.trim(), contact: input.contact.trim() }
    if ([normalized.name, normalized.region, normalized.purpose, normalized.ownerLegalName, normalized.contact].some((value) => !value)) {
      throw new DomainError('INVALID_ORGANIZATION', '请完整填写组织与负责人资料', 422)
    }
    const now = this.dependencies.now(), id = randomUUID()
    return this.dependencies.transaction.run(async (repositories) => {
      await this.authorize(repositories, actor, now)
      await this.requireOwner(repositories, normalized.ownerUserId)
      await repositories.organizations.create(id, normalized, now)
      const result = await target(repositories, id)
      await record(repositories, actor, id, 'organization.created', now, null, result)
      return result
    })
  }

  async decide(actor: string, id: string, input: OrganizationDecision) {
    const now = this.dependencies.now(), reason = input.reason.trim()
    if (!reason) throw new DomainError('REASON_REQUIRED', '请填写操作理由', 422)
    return this.dependencies.transaction.run(async (repositories) => {
      await this.authorize(repositories, actor, now)
      const before = await target(repositories, id, true)
      if (before.version !== input.expectedVersion) throw conflict()
      const to = organizationStatusAfter(before.status, input.action)
      if (!to) throw new DomainError('INVALID_ORGANIZATION_STATE', '当前组织状态不允许此操作，请重新读取', 409)
      if (input.action === 'approve' || input.action === 'unfreeze') await this.requireOwner(repositories, before.ownerUserId)
      if (input.action === 'approve') await this.activateOwner(repositories, actor, before, now)
      if (input.action === 'unfreeze') await this.requireOwnerAuthority(repositories, before, now)
      if (!await repositories.organizations.changeStatus(id, input.expectedVersion, to, actor, reason,
        input.action === 'approve' || input.action === 'reject', now)) throw conflict()
      const after = await target(repositories, id)
      const action = input.action === 'freeze' ? 'organization.frozen' : input.action === 'unfreeze' ? 'organization.unfrozen' : 'organization.reviewed'
      await record(repositories, actor, id, action, now, before, after, reason)
      return after
    })
  }

  private async authorize(repositories: OrganizationsRepositories, actor: string, now: Date) {
    if (!await repositories.identities.requireActiveActor(actor)) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
    await requirePermission(repositories.authorization, { subjectUserId: actor, permission: 'platform.manage',
      resource: { type: 'platform', id: null } }, now, this.dependencies.permissions)
  }

  private async requireOwner(repositories: OrganizationsRepositories, userId: string) {
    if (!await repositories.identities.requireActiveActor(userId)) {
      throw new DomainError('INVALID_OWNER', '负责人须为有效且邮箱已验证的用户', 422)
    }
  }

  private async activateOwner(repositories: OrganizationsRepositories, actor: string, organization: OrganizationDetail, now: Date) {
    await repositories.organizations.activateOwnerMembership(randomUUID(), organization.id, organization.ownerUserId)
    for (const role of ['owner', 'organizer'] as const) {
      const bindingId = randomUUID()
      const inserted = await repositories.authorization.insertBinding({ id: bindingId, subjectUserId: organization.ownerUserId,
        role, scopeType: 'organization', scopeId: organization.id, grantedBy: actor, startsAt: now.toISOString(), expiresAt: null, revokedAt: null })
      if (!inserted) throw new DomainError('ROLE_ALREADY_BOUND', '组织已有负责人角色，请核对后再审核', 409)
      await appendAudit(repositories.audit, { actorUserId: actor, action: 'role.granted', resourceType: 'role_binding',
        resourceId: bindingId, scopeType: 'organization', scopeId: organization.id, organizationId: organization.id,
        reason: null, before: null, after: { role, subjectUserId: organization.ownerUserId, scopeType: 'organization', scopeId: organization.id } }, now)
    }
  }

  private async requireOwnerAuthority(repositories: OrganizationsRepositories, organization: OrganizationDetail, now: Date) {
    const bindings = await repositories.authorization.findBindings(organization.ownerUserId)
    const owner = bindings.some((binding) => binding.role === 'owner' && binding.scopeType === 'organization'
      && binding.scopeId === organization.id && !binding.revokedAt && Date.parse(binding.startsAt) <= now.getTime()
      && (!binding.expiresAt || Date.parse(binding.expiresAt) > now.getTime()))
    if (!owner || !await repositories.authorization.isActiveMember(organization.ownerUserId, organization.id)) {
      throw new DomainError('INVALID_OWNER_AUTHORITY', '负责人成员关系或所有者角色已失效，请先处理组织治理', 409)
    }
  }
}
