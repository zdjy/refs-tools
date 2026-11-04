import type { Profile, UpdateProfileBody } from '@refs-tools/contracts/profile'
import { normalizeProfileText, validateProfile, type ProfileValidationError } from '@refs-tools/domain'
import { DomainError } from '../../application/errors.js'
import { appendAudit } from '../audit/audit.service.js'
import type { AuditRepository } from '../audit/audit.types.js'
import type { ProfileDependencies, ProfileWrite } from './profiles.types.js'

const messages: Record<ProfileValidationError, string> = {
  INVALID_NICKNAME: '昵称需为 1-80 个字符', INVALID_LEGAL_NAME: '真实姓名不超过 40 个字符',
  INVALID_PHONE: '请填写含国家代码的手机号，例如 +8613800138000',
  INVALID_REGION: '请选择完整的省/市/区', INVALID_ADDRESS: '详细地址不超过 200 个字符',
  INVALID_BIRTH_DATE: '请选择 1900-01-01 至今天的有效日期',
}

/** 只覆盖请求中出现的字段；显式 null 表示清空，空字符串按未填写处理。 */
function merged(current: Profile, patch: UpdateProfileBody): ProfileWrite {
  return {
    nickname: (patch.nickname ?? current.nickname).trim(),
    legalName: patch.legalName !== undefined ? normalizeProfileText(patch.legalName) : current.legalName,
    phone: patch.phone !== undefined ? normalizeProfileText(patch.phone) : current.phone,
    regionCode: patch.regionCode !== undefined ? patch.regionCode : current.regionCode,
    regionLabel: patch.regionLabel !== undefined ? normalizeProfileText(patch.regionLabel) : current.regionLabel,
    addressDetail: patch.addressDetail !== undefined ? normalizeProfileText(patch.addressDetail) : current.addressDetail,
    birthDate: patch.birthDate !== undefined ? patch.birthDate : current.birthDate,
    avatarMediaId: patch.avatarMediaId !== undefined ? patch.avatarMediaId : current.avatarMediaId,
  }
}

function changed(current: Profile, next: ProfileWrite): boolean {
  return (Object.keys(next) as (keyof ProfileWrite)[]).some((key) => next[key] !== current[key])
}

function conflict(): DomainError {
  return new DomainError('VERSION_CONFLICT', '档案已被其他操作更新，请刷新后重新提交', 409)
}

/** 只记录字段无关的版本投影：实名等个人数据不进入审计快照。 */
async function record(audit: AuditRepository, actor: string, before: Profile, after: Profile, now: Date) {
  await appendAudit(audit, { actorUserId: actor, action: 'profile.updated', resourceType: 'user', resourceId: actor,
    scopeType: 'self', scopeId: actor, organizationId: null, reason: null,
    before: { version: before.version }, after: { version: after.version } }, now)
}

/** 本人档案用例；档案与昵称共用 users.version，读写都在同一事务内完成。 */
export class ProfilesService {
  constructor(private readonly dependencies: ProfileDependencies) {}

  async get(actor: string): Promise<Profile> {
    return this.dependencies.transaction.run(async (repositories) => {
      const profile = await repositories.profiles.find(actor, false)
      if (!profile) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
      return profile
    })
  }

  async update(actor: string, input: UpdateProfileBody): Promise<Profile> {
    const now = this.dependencies.now(), today = now.toISOString().slice(0, 10)
    return this.dependencies.transaction.run(async (repositories) => {
      const current = await repositories.profiles.find(actor, true)
      if (!current) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
      if (current.version !== input.version) throw conflict()
      const next = merged(current, input)
      const error = validateProfile(next, today)
      if (error) throw new DomainError(error, messages[error], 422)
      if (!changed(current, next)) return current
      if (next.avatarMediaId !== null && next.avatarMediaId !== current.avatarMediaId
        && !await repositories.profiles.ownedAvatar(actor, next.avatarMediaId)) {
        throw new DomainError('INVALID_AVATAR', '请先完成头像上传再保存', 422)
      }
      if (!await repositories.profiles.save(actor, input.version, next)) throw conflict()
      const after: Profile = { ...next, userId: actor, version: input.version + 1 }
      await record(repositories.audit, actor, current, after, now)
      return after
    })
  }
}
