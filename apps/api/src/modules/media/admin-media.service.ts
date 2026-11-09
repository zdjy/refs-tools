import { Value } from '@sinclair/typebox/value'
import { AdminMediaOperationSchema, AdminMediaQuerySchema, type AdminMediaOperation, type AdminMediaQuery } from '@refs-tools/contracts/admin-media'
import { DomainError } from '../../application/errors.js'
import { appendAudit } from '../audit/audit.service.js'
import { requirePermission } from '../authorization/authorization.service.js'
import { hidden } from './media-access.service.js'
import type { AdminMediaDependencies, AdminMediaRepositories, StoredMedia } from './media.types.js'

/** 独立平台治理用例，不扩大普通媒体 owner/业务关系入口的权限。 */
export class AdminMediaService {
  constructor(private readonly dependencies: AdminMediaDependencies) {}

  async list(actor: string, query: AdminMediaQuery) {
    if (!Value.Check(AdminMediaQuerySchema, query)) throw new DomainError('INVALID_REQUEST', '查询参数不符合要求', 400)
    return this.dependencies.transaction.run(async (repositories) => {
      await this.authorize(repositories, actor)
      const result = await repositories.adminMedia.list(query)
      await this.audit(repositories, actor, actor, 'media.queried', null)
      return result
    })
  }

  async detail(actor: string, id: string) {
    return this.dependencies.transaction.run(async (repositories) => {
      await this.authorize(repositories, actor)
      const result = await repositories.adminMedia.detail(id)
      if (!result) throw hidden()
      await this.audit(repositories, actor, id, 'media.queried', null)
      return result
    })
  }

  async read(actor: string, id: string, input: AdminMediaOperation) {
    const reason = this.reason(input)
    const media = await this.dependencies.transaction.run(repositories => this.current(repositories, actor, id))
    this.available(media)
    const authorization = await this.dependencies.storage.signRead(media, 60)
    // 签名期间可能撤权或删除，未完成第二阶段授权与审计不得返回能力 URL。
    await this.dependencies.transaction.run(async repositories => {
      this.available(await this.current(repositories, actor, id))
      await this.audit(repositories, actor, id, 'media.read_authorized', reason)
    })
    return authorization
  }

  async remove(actor: string, id: string, input: AdminMediaOperation) {
    const reason = this.reason(input)
    const media = await this.dependencies.transaction.run(async repositories => {
      const current = await this.current(repositories, actor, id)
      if (current.status === 'available' && ['certification_evidence', 'exam_answer', 'post_game_record'].includes(current.purpose)) {
        throw new DomainError('MEDIA_RETENTION_REQUIRED', '留存材料须由所属业务审批删除', 409)
      }
      if (current.status !== 'deleted') await repositories.media.transition(id, current.status, 'deleted', this.dependencies.now().toISOString())
      await this.audit(repositories, actor, id, 'media.deleted', reason)
      return current
    })
    // 逻辑撤销已经提交，物理删除失败只能重试，不能恢复文件可读性或提示已清理。
    await this.dependencies.storage.delete(media.objectKey)
    return { status: 'deleted' as const }
  }

  private async authorize(repositories: AdminMediaRepositories, actor: string) {
    const account = await repositories.media.lockAccount(actor)
    if (!account) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
    if (!account.verified) throw new DomainError('EMAIL_NOT_VERIFIED', '请先验证邮箱', 403)
    await requirePermission(repositories.authorization, { subjectUserId: actor, permission: 'media.manage',
      resource: { type: 'platform', id: null } }, this.dependencies.now(), this.dependencies.permissions)
  }

  private async current(repositories: AdminMediaRepositories, actor: string, id: string) {
    await this.authorize(repositories, actor)
    const media = await repositories.media.find(id)
    if (!media) throw hidden()
    return media
  }

  private available(media: StoredMedia) {
    if (media.purpose === 'certification_evidence') {
      throw new DomainError('CERTIFICATION_ACCESS_REQUIRED', '认证原件须从对应认证申请或申诉入口访问', 403)
    }
    if (media.status !== 'available') throw new DomainError('MEDIA_NOT_AVAILABLE', '文件尚不可下载', 409)
  }

  private reason(input: AdminMediaOperation) {
    if (!Value.Check(AdminMediaOperationSchema, input) || !input.reason.trim()) throw new DomainError('REASON_REQUIRED', '请填写操作理由', 422)
    if (/(?:https?:|[a-z][a-z0-9+.-]*:\/\/|password|token|secret|signature|验证码|密码|密钥)/i.test(input.reason)) {
      throw new DomainError('INVALID_AUDIT_EVENT', '理由不能包含凭据或 URL', 422)
    }
    return input.reason.trim()
  }

  private async audit(repositories: AdminMediaRepositories, actor: string, id: string,
    action: 'media.queried' | 'media.read_authorized' | 'media.deleted', reason: string | null) {
    await appendAudit(repositories.audit, { actorUserId: actor, action, resourceType: 'media', resourceId: id,
      scopeType: 'platform', scopeId: null, organizationId: null, reason, before: null, after: null }, this.dependencies.now())
  }
}
