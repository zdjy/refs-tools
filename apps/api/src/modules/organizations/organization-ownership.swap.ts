import type { OrganizationDetail } from '@refs-tools/contracts/organizations'
import { DomainError } from '../../application/errors.js'
import { appendAudit } from '../audit/audit.service.js'
import { revokeMemberRoles } from './organization-members.access.js'
import { grantOwnerRoles } from './organization-owner-roles.js'
import type { AccessRepositories } from './organization-access.types.js'

/**
 * 校验新负责人：账号有效、是本组织 active 成员、账户资料完整。
 * 资料完整是因为组织记录会快照负责人实名与联系方式，与自助申请的要求一致（422 PROFILE_INCOMPLETE）。
 * 发起移交与最终生效都要校验，因为请求有效期内接收人状态可能已变化。
 */
export async function validateNewOwner(r: AccessRepositories, organization: OrganizationDetail, toUserId: string) {
  if (toUserId === organization.ownerUserId) throw new DomainError('SAME_OWNER', '新负责人不能是当前负责人', 422)
  if (!await r.identities.requireActiveActor(toUserId)) throw new DomainError('INVALID_OWNER', '新负责人须为有效且邮箱已验证的用户', 422)
  if (!await r.authorization.isActiveMember(toUserId, organization.id)) {
    throw new DomainError('NOT_ACTIVE_MEMBER', '新负责人须为本组织的正式成员', 422)
  }
  const profile = await r.self.applicantProfile(toUserId)
  const legalName = profile?.legalName?.trim(), contact = profile?.phone?.trim()
  if (!legalName || !contact) throw new DomainError('PROFILE_INCOMPLETE', '新负责人需先在账号设置中填写真实姓名和手机号', 422)
  return { legalName, contact }
}

/**
 * 同事务完成所有权换手：旧负责人撤销全部组织范围角色（含下属赛事/比赛），仅保留正式成员身份；
 * 新负责人获得 owner 与 organizer。调用方须已锁定组织行，`organization.version` 即当前行版本。
 * 组织状态与授权依据由调用方各自判定（负责人路径仅 active，平台路径含 frozen）。
 */
export async function swapOwner(r: AccessRepositories, actor: string, organization: OrganizationDetail, toUserId: string,
  reason: string, now: Date) {
  const profile = await validateNewOwner(r, organization, toUserId)
  const oldOwner = organization.ownerUserId
  await revokeMemberRoles(r, actor, oldOwner, organization.id, now)
  await grantOwnerRoles(r, { actor, grantedBy: actor, organizationId: organization.id, userId: toUserId }, now, false)
  if (!await r.organizations.changeOwner(organization.id, organization.version, toUserId, profile.legalName, profile.contact)) {
    throw new DomainError('VERSION_CONFLICT', '组织已更新，请重新读取后再操作', 409)
  }
  await appendAudit(r.audit, { actorUserId: actor, action: 'organization.ownership_transferred', resourceType: 'organization',
    resourceId: organization.id, scopeType: 'organization', scopeId: organization.id, organizationId: organization.id, reason,
    before: { status: organization.status, version: organization.version, subjectUserId: oldOwner },
    after: { status: organization.status, version: organization.version + 1, subjectUserId: toUserId } }, now)
  for (const change of await r.ownership.supersedePending(organization.id, now)) {
    await appendAudit(r.audit, { actorUserId: actor, action: 'ownership_transfer.changed', resourceType: 'organization_ownership_transfer',
      resourceId: change.id, scopeType: 'organization', scopeId: organization.id, organizationId: organization.id, reason,
      before: { status: 'pending', version: change.version - 1 }, after: { status: 'superseded', version: change.version } }, now)
  }
}
