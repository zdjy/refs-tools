import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { certificationFixture } from './fixture.js'

describe('认证申请与审核边界', () => {
  it('审核身份投影与记录筛选沿用实时授权，负责人不因身份读取普通记录', async () => {
    const f = certificationFixture()
    const result = await f.service.records(f.reviewer, f.scope, { status: 'approved', page: '2' })
    expect(result.items[0]?.applicant).toEqual({ nickname: '裁判昵称', legalName: '裁判实名' })
    expect(f.r.certifications.reviewList).toHaveBeenCalledWith({ scope: f.scope, records: true, status: 'approved' }, { status: 'approved', page: '2' })
    expect(JSON.stringify(f.audits)).not.toContain('裁判实名')
    await expect(f.service.records(f.owner, f.scope, {})).rejects.toMatchObject({ statusCode: 404 })
    f.setRevoked(true)
    await expect(f.service.records(f.reviewer, f.scope, {})).rejects.toMatchObject({ statusCode: 404 })
  })

  it('创建幂等且拒绝同键不同材料；版本历史不含签名链接', async () => {
    const f = certificationFixture(); f.setExists(false)
    const created = await f.service.create(f.subject, f.input, 'create-1')
    expect(created).toMatchObject({ status: 'draft', version: 1 })
    expect((await f.service.create(f.subject, f.input, 'create-1')).id).toBe(created.id)
    await expect(f.service.create(f.subject, { ...f.input, issuer: '另一机构' }, 'create-1')).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' })
    expect(f.histories).toHaveLength(1)
    expect(JSON.stringify(f.audits)).not.toContain('私有编号')
  })
  it('组织成员与平台申请前置条件在创建和提交时重验', async () => {
    const f = certificationFixture(); f.setExists(false); f.setMember(false)
    await expect(f.service.create(f.subject, f.input, 'org')).rejects.toMatchObject({ code: 'CERTIFICATION_MEMBERSHIP_REQUIRED' })
    f.setPrerequisite(false)
    await expect(f.service.create(f.subject, { ...f.input, scope: { type: 'platform', organizationId: null } }, 'platform'))
      .rejects.toMatchObject({ code: 'CERTIFICATION_PREREQUISITE_REQUIRED' })
    f.setRecord({ scope: { type: 'platform', organizationId: null }, status: 'draft' }); f.setExists(true)
    await expect(f.service.submit(f.subject, f.record().id, 2)).rejects.toMatchObject({ code: 'CERTIFICATION_PREREQUISITE_REQUIRED' })
  })
  it('不能跨组织、自审、使用陈旧版本或在撤权后继续审核', async () => {
    const f = certificationFixture(), id = f.record().id
    const decision = { decision: 'approve' as const, reason: '核对材料与履历', expectedVersion: 2 }
    await expect(f.review.decide(f.reviewer, id, { type: 'organization', organizationId: randomUUID() }, decision)).rejects.toMatchObject({ statusCode: 404 })
    await expect(f.review.decide(f.subject, id, f.scope, decision)).rejects.toMatchObject({ code: 'CERTIFICATION_SELF_REVIEW' })
    await expect(f.review.decide(f.reviewer, id, f.scope, { ...decision, expectedVersion: 1 })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' })
    f.setRevoked(true)
    await expect(f.review.decide(f.reviewer, id, f.scope, decision)).rejects.toMatchObject({ statusCode: 404 })
    expect(f.r.certifications.save).not.toHaveBeenCalled()
  })
  it('审核要求申请人仍为成员，补件产生新版本并可再提交', async () => {
    const f = certificationFixture(), id = f.record().id
    f.setMember(false)
    await expect(f.review.decide(f.reviewer, id, f.scope, { decision: 'approve', reason: '核验', expectedVersion: 2 }))
      .rejects.toMatchObject({ code: 'CERTIFICATION_MEMBERSHIP_REQUIRED' })
    f.setMember(true)
    await f.review.decide(f.reviewer, id, f.scope, { decision: 'needs_more_information', reason: '补履历', expectedVersion: 2 })
    const { scope: _, ...materials } = f.input
    await f.service.update(f.subject, id, { ...materials, statement: '补充履历', expectedVersion: 3 })
    expect(await f.service.submit(f.subject, id, 4)).toMatchObject({ status: 'under_review', version: 5 })
    expect(f.histories.map(r => r.version)).toEqual([3, 4, 5])
  })
  it('持有人退出后负责人仍可撤销认证，避免重新入会恢复已失效资质', async () => {
    const f = certificationFixture(); f.setRecord({ status: 'approved', effectiveStatus: 'suspended' }); f.setMember(false)
    expect(await f.review.decide(f.owner, f.record().id, f.scope, { expectedVersion: 2, decision: 'revoke', reason: '资质撤销' }))
      .toMatchObject({ status: 'revoked', effectiveStatus: 'revoked', version: 3 })
  })
  it('材料须可用、本人所有、认证专用且不能跨认证范围复用', async () => {
    const f = certificationFixture(); f.setExists(false)
    f.records.get(f.input.evidenceMediaIds[0]!)!.status = 'pending_upload'
    await expect(f.service.create(f.subject, f.input, 'pending')).rejects.toMatchObject({ code: 'CERTIFICATION_EVIDENCE_INVALID' })
    f.records.get(f.input.evidenceMediaIds[0]!)!.status = 'available'
    vi.mocked(f.r.certifications.mediaReferences).mockResolvedValue([{ id: randomUUID(), subjectUserId: f.subject, scope: { type: 'platform', organizationId: null } }])
    await expect(f.service.create(f.subject, f.input, 'cross')).rejects.toMatchObject({ code: 'CERTIFICATION_EVIDENCE_SCOPE_CONFLICT' })
  })
})

describe('认证申诉与私有证据', () => {
  it('申诉保持原效力，原审核人不能复核，负责人改判留历史', async () => {
    const f = certificationFixture(), id = f.record().id
    f.setRecord({ status: 'rejected', effectiveStatus: 'rejected', reviewedBy: f.reviewer })
    const appeal = await f.appealService.create(f.subject, id, { expectedVersion: 2, reason: '请复核', evidenceMediaIds: [] })
    expect(f.record()).toMatchObject({ status: 'rejected', version: 3 })
    await expect(f.appealService.create(f.subject, id, { expectedVersion: 3, reason: '再次提交', evidenceMediaIds: [] })).rejects.toMatchObject({ code: 'APPEAL_PENDING' })
    f.appeals.set(appeal.id, { ...appeal, originalReviewerId: f.owner })
    await expect(f.appealService.decide(f.owner, id, appeal.id, { expectedVersion: 3, decision: 'overturn', reason: '核验' }))
      .rejects.toMatchObject({ code: 'APPEAL_REVIEWER_CONFLICT' })
    f.appeals.set(appeal.id, appeal)
    await expect(f.appealService.application(f.owner, id, appeal.id)).resolves.toMatchObject({ id, status: 'rejected' })
    expect(await f.appealService.decide(f.owner, id, appeal.id, { expectedVersion: 3, decision: 'overturn', reason: '独立核验通过' }))
      .toMatchObject({ status: 'decided', reviewerId: f.owner })
    expect(f.record()).toMatchObject({ status: 'approved', version: 4 })
    expect(f.histories[0]!.status).toBe('rejected')
  })
  it('普通审核不能越过待处理申诉', async () => {
    const f = certificationFixture(), id = f.record().id
    f.setRecord({ status: 'revoked', effectiveStatus: 'revoked', reviewedBy: f.reviewer })
    await f.appealService.create(f.subject, id, { expectedVersion: 2, reason: '复核撤销', evidenceMediaIds: [] })
    await expect(f.review.decide(f.owner, id, f.scope, { expectedVersion: 3, decision: 'revoke', reason: '重复撤销' }))
      .rejects.toMatchObject({ code: 'APPEAL_PENDING' })
  })
  it('证据读取双重授权，存储签名期间撤权不会返回链接或写成功审计', async () => {
    const f = certificationFixture(), id = f.record().id, mediaId = f.input.evidenceMediaIds[0]!
    const signed = await f.evidence.read(f.reviewer, id, mediaId)
    expect(signed.url).toBe('https://storage.example/read')
    expect(JSON.stringify(f.audits)).not.toContain(signed.url)
    const count = f.audits.length
    f.d.storage!.signRead = async () => { f.setRevoked(true); return signed }
    await expect(f.evidence.read(f.reviewer, id, mediaId)).rejects.toMatchObject({ statusCode: 404 })
    expect(f.audits).toHaveLength(count)
  })
  it('无关联证据拒绝；申请人退出后仍能读取已留存历史原件', async () => {
    const f = certificationFixture(), id = f.record().id, mediaId = f.input.evidenceMediaIds[0]!
    vi.mocked(f.r.certifications.hasEvidence).mockResolvedValueOnce(false)
    await expect(f.evidence.read(f.subject, id, mediaId)).rejects.toMatchObject({ statusCode: 404 })
    f.setMember(false)
    await expect(f.evidence.read(f.subject, id, mediaId)).resolves.toHaveProperty('url')
  })
})
