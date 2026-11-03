import { randomUUID } from 'node:crypto'
import { Value } from '@sinclair/typebox/value'
import { AuditQuerySchema, type AuditList, type AuditQuery } from '@refs-tools/contracts/audit'
import { requirePermission } from '../authorization/authorization.service.js'
import type { ResourceReference } from '../authorization/authorization.types.js'
import { DomainError } from '../../application/errors.js'
import { NewAuditEventSchema } from './audit.schema.js'
import type { AuditDependencies, AuditRepository, NewAuditEvent } from './audit.types.js'

/** 仅在调用者事务内追加白名单投影；拒绝疑似凭据/URL，不能代替业务调用方对自由文本的最小化处理。 */
export async function appendAudit(repository: AuditRepository, input: NewAuditEvent, now: Date): Promise<void> {
  if (!Value.Check(NewAuditEventSchema, input) || !validScope(input)
    || (input.reason !== null && /(?:https?:|[a-z][a-z0-9+.-]*:\/\/|password|token|secret|signature|验证码|密码|密钥)/i.test(input.reason))) {
    throw new DomainError('INVALID_AUDIT_EVENT', '审计记录包含不允许的数据', 422)
  }
  await repository.append({ ...input, id: randomUUID(), createdAt: now.toISOString() })
}

function validScope(input: NewAuditEvent): boolean {
  if (input.scopeType === 'platform') return input.scopeId === null && input.organizationId === null
  if (input.scopeId === null) return false
  if (input.scopeType === 'self') return input.organizationId === null
  if (input.scopeType === 'organization') return input.organizationId === input.scopeId
  return input.organizationId !== null
}

/** 授权读取与“读取审计”的记录同事务，写入失败时不向调用者返回结果。 */
export class AuditService {
  constructor(private readonly dependencies: AuditDependencies) {}

  async listOrganization(actor: string, organizationId: string, query: AuditQuery): Promise<AuditList> {
    return this.list(actor, { type: 'organization', id: organizationId }, query)
  }

  private async list(actor: string, reference: ResourceReference, query: AuditQuery): Promise<AuditList> {
    if (!Value.Check(AuditQuerySchema, query)) throw new DomainError('INVALID_REQUEST', '查询参数不符合要求', 400)
    const now = this.dependencies.now()
    return this.dependencies.transaction.run(async ({ authorization, audit }) => {
      const scope = await requirePermission(authorization, { subjectUserId: actor, permission: 'audit.read', resource: reference }, now, this.dependencies.permissions)
      const result = await audit.list({ ...query, limit: Number(query.limit ?? '50'),
        ...(scope.organizationId === null ? {} : { organizationId: scope.organizationId }) })
      await appendAudit(audit, { actorUserId: actor, action: 'audit.queried', resourceType: 'audit_log',
        resourceId: scope.organizationId ?? actor, scopeType: scope.type, scopeId: scope.id,
        organizationId: scope.organizationId, reason: null, before: null, after: null }, now)
      return result
    })
  }
}
