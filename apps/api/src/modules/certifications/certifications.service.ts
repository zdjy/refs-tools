import { createHash, randomUUID } from 'node:crypto'
import type { Certification, CertificationScope, CreateCertification, UpdateCertification, CertificationRecordsQuery } from '@refs-tools/contracts/certifications'
import type { PageQuery } from '@refs-tools/contracts/pagination'
import { DomainError } from '../../application/errors.js'
import { appendAudit } from '../audit/audit.service.js'
import { certificationAccount, certificationAudit, certificationHidden, lockCertification, lockPrerequisiteOrganizations, requireCertificationMedia,
  requireCertificationReviewer, requireCertificationSubject, requireCertificationVersion, saveCertification } from './certifications.access.js'
import type { CertificationDependencies } from './certifications.types.js'

/** 认证申请、材料编辑与本人档案；级别仅保存标签，不参与权限或排序。 */
export class CertificationsService {
  constructor(private readonly d: CertificationDependencies) {}

  async create(actor: string, input: CreateCertification, key: string) {
    if (!/^[A-Za-z0-9._:-]{1,100}$/.test(key)) throw new DomainError('INVALID_REQUEST', '请提供有效请求键', 400)
    const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex')
    return this.d.transaction.run(async r => {
      const prerequisites = input.scope.type === 'platform' ? await lockPrerequisiteOrganizations(r, actor) : []
      if (input.scope.type === 'organization') await r.certifications.lockOrganization(input.scope.organizationId)
      await certificationAccount(r, actor)
      const previous = await r.certifications.request(actor, key)
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw new DomainError('IDEMPOTENCY_CONFLICT', '请求键已用于其他申请', 409)
        return (await r.certifications.find(previous.id))!
      }
      await requireCertificationSubject(r, actor, input.scope, prerequisites)
      if (await r.certifications.current(actor, input.scope)) throw new DomainError('CERTIFICATION_EXISTS', '已有该范围认证，请补件或申诉', 409)
      await requireCertificationMedia(r, actor, input.scope, [...input.evidenceMediaIds, ...input.historyMediaIds])
      const now = this.d.now().toISOString()
      const record: Certification = { ...input, id: randomUUID(), subjectUserId: actor, status: 'draft', effectiveStatus: 'draft',
        reviewedBy: null, reviewedAt: null, reviewNote: null, version: 1, createdAt: now, updatedAt: now }
      await r.certifications.insert(record, key, fingerprint)
      await r.certifications.appendHistory(record, actor, 'created', now)
      await certificationAudit(r, this.d, actor, record, null, 'certification.changed')
      return record
    })
  }

  async mine(actor: string, query: PageQuery) {
    return this.d.transaction.run(async r => {
      await certificationAccount(r, actor)
      return r.certifications.list({ subjectUserId: actor }, query)
    })
  }

  async detail(actor: string, id: string) {
    return this.d.transaction.run(async r => {
      const record = await lockCertification(r, actor, id)
      if (record.subjectUserId !== actor) await requireCertificationReviewer(r, this.d, actor, record.scope)
      await certificationAudit(r, this.d, actor, record, null, 'certification.queried')
      return record
    })
  }

  async history(actor: string, id: string, query: PageQuery) {
    return this.d.transaction.run(async r => {
      const record = await lockCertification(r, actor, id)
      if (record.subjectUserId !== actor) await requireCertificationReviewer(r, this.d, actor, record.scope)
      const result = await r.certifications.history(id, query)
      await certificationAudit(r, this.d, actor, record, null, 'certification.queried')
      return result
    })
  }

  async update(actor: string, id: string, input: UpdateCertification) {
    return this.d.transaction.run(async r => {
      const before = await lockCertification(r, actor, id)
      if (before.subjectUserId !== actor) throw certificationHidden()
      requireCertificationVersion(before, input.expectedVersion)
      if (!['draft', 'needs_more_information'].includes(before.status)) throw new DomainError('INVALID_CERTIFICATION_STATE', '当前状态不可编辑材料', 409)
      if (before.scope.type === 'organization') await requireCertificationSubject(r, actor, before.scope)
      await requireCertificationMedia(r, actor, before.scope, [...input.evidenceMediaIds, ...input.historyMediaIds])
      const { expectedVersion: _, ...materials } = input
      return saveCertification(r, this.d, actor, before, { ...before, ...materials, version: before.version + 1,
        updatedAt: this.d.now().toISOString() }, 'certification.changed')
    })
  }

  async submit(actor: string, id: string, expectedVersion: number) {
    return this.d.transaction.run(async r => {
      const prerequisites: string[] = []
      const before = await lockCertification(r, actor, id, prerequisites)
      if (before.subjectUserId !== actor) throw certificationHidden()
      requireCertificationVersion(before, expectedVersion)
      if (!['draft', 'needs_more_information'].includes(before.status)) throw new DomainError('INVALID_CERTIFICATION_STATE', '当前状态不能提交', 409)
      await requireCertificationSubject(r, actor, before.scope, prerequisites)
      await requireCertificationMedia(r, actor, before.scope, [...before.evidenceMediaIds, ...before.historyMediaIds])
      return saveCertification(r, this.d, actor, before, { ...before, status: 'under_review', effectiveStatus: 'under_review',
        version: before.version + 1, updatedAt: this.d.now().toISOString() }, 'certification.changed')
    })
  }

  async queue(actor: string, scope: CertificationScope, query: PageQuery, appealQueue = false) {
    return this.d.transaction.run(async r => {
      if (scope.type === 'organization') await r.certifications.lockOrganization(scope.organizationId)
      await certificationAccount(r, actor)
      await requireCertificationReviewer(r, this.d, actor, scope, appealQueue)
      const result = await r.certifications.reviewList({ scope, queue: !appealQueue, appealQueue }, query)
      await this.auditList(r, actor, scope)
      return result
    })
  }

  /** 管理记录排除未提交草稿，保持普通审核权限，不因组织负责人身份扩大读取。 */
  async records(actor: string, scope: CertificationScope, query: CertificationRecordsQuery) {
    return this.d.transaction.run(async r => {
      if (scope.type === 'organization') await r.certifications.lockOrganization(scope.organizationId)
      await certificationAccount(r, actor)
      await requireCertificationReviewer(r, this.d, actor, scope)
      const result = await r.certifications.reviewList({ scope, records: true, ...(query.status ? { status: query.status } : {}) }, query)
      await this.auditList(r, actor, scope)
      return result
    })
  }

  private async auditList(r: import('./certifications.types.js').CertificationRepositories, actor: string, scope: CertificationScope) {
    await appendAudit(r.audit, { actorUserId: actor, action: 'certification.queried', resourceType: 'certification',
      resourceId: scope.organizationId ?? actor, scopeType: scope.type, scopeId: scope.organizationId,
      organizationId: scope.organizationId, reason: null, before: null, after: null }, this.d.now())
  }
}
