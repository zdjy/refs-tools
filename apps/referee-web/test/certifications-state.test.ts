import { describe, expect, it, vi } from 'vitest'
import { createRenderer, defineComponent, ref } from 'vue'
import type { Certification, CertificationAppeal, CertificationSummary } from '@refs-tools/contracts/certifications'
import type { MyOrganization } from '@refs-tools/contracts/organization-self'
import { CertificationsApiError, type CertificationsApi } from '../src/api/certifications.api'
import type { OrganizationsApi } from '../src/api/organizations.api'
import {
  applicantTag, appealDecisionOptions, certificationErrorMessage, pendingAppeal, reviewDecisionOptions,
} from '../src/features/certifications/certifications.presentation'
import {
  createBodyFrom, draftFrom, draftProblems, updateBodyFrom, uploadOptionsFor,
} from '../src/features/certifications/useCertificationDraft'
import { useCertificationForm } from '../src/features/certifications/useCertificationForm'
import { useCertifications } from '../src/features/certifications/useCertifications'
import { useReviewAccess } from '../src/features/certifications/useReviewAccess'
import { useReviewQueues } from '../src/features/certifications/useReviewQueues'

const iso = '2025-01-02T03:04:05.000Z'
const record: Certification = {
  id: 'c1', subjectUserId: 'u1', scope: { type: 'organization', organizationId: 'o1' }, level: 'level_1',
  certificateNumber: 'A-1', issuer: '市篮球协会', obtainedAt: null, evidenceMediaIds: ['m1'], historyMediaIds: ['m2'],
  statement: '本人承诺材料真实。', status: 'draft', effectiveStatus: 'draft', reviewedBy: null, reviewedAt: null,
  reviewNote: null, version: 1, createdAt: iso, updatedAt: iso,
}
const summary: CertificationSummary = (({ id, subjectUserId, scope, level, status, effectiveStatus, reviewedAt, version, createdAt, updatedAt }) =>
  ({ id, subjectUserId, scope, level, status, effectiveStatus, reviewedAt, version, createdAt, updatedAt }))(record)
const page = <T>(items: T[]) => ({ items, total: items.length, page: 1, pageSize: 20 })
const appeal: CertificationAppeal = {
  id: 'a1', certificationId: 'c1', appellantId: 'u1', reason: '请求复核', evidenceMediaIds: [], status: 'pending',
  originalReviewerId: 'r1', reviewerId: null, decision: null, reviewReason: null, createdAt: iso, decidedAt: null,
}
const api = (patch: Record<string, unknown> = {}) => ({
  mine: vi.fn(async () => page([summary])), detail: vi.fn(async () => record), history: vi.fn(async () => page([])),
  appeals: vi.fn(async () => page([])), create: vi.fn(async () => record), update: vi.fn(async () => record),
  submit: vi.fn(async () => ({ ...record, status: 'under_review', version: 2 })), createAppeal: vi.fn(async () => appeal),
  decide: vi.fn(async () => ({ ...record, status: 'approved', version: 2 })), decideAppeal: vi.fn(async () => appeal),
  reviewQueue: vi.fn(async () => page([summary])), appealQueue: vi.fn(async () => page([summary])), records: vi.fn(async () => page([summary])),
  evidenceUrl: vi.fn(async () => ({ url: 'https://storage/signed', expiresAt: iso })), ...patch,
} as unknown as CertificationsApi)
const org = (patch: Record<string, unknown> = {}) => ({ mine: vi.fn(async () => page([])), ...patch } as unknown as OrganizationsApi)
const organization = (patch: Partial<MyOrganization> = {}) => ({
  id: 'o1', name: '市篮球协会', region: '浙江省/杭州市', purpose: '', status: 'active', createdAt: iso, version: 1,
  isOwner: false, ownerUserId: 'u0', membership: { id: 'mem', status: 'active', version: 1 }, roles: [] as MyOrganization['roles'],
  canManage: false, canGrantRoles: false, governanceReason: null, ...patch,
} as MyOrganization)

describe('认证表单投影', () => {
  it('从记录恢复草稿并校验必填、日期与材料数量', () => {
    const draft = draftFrom(record)
    expect(draftProblems(draft, false)).toEqual({})
    const empty = draftFrom(null)
    const problems = draftProblems(empty, true)
    expect(problems.organizationId).toContain('请选择')
    expect(problems.certificateNumber).toContain('请填写')
    expect(problems.evidence).toContain('至少上传')
    empty.scopeType = 'platform'; empty.obtainedAt = '2025-02-30'; empty.evidenceMediaIds = ['m1']; empty.historyMediaIds = ['m2']
    empty.certificateNumber = 'A'; empty.issuer = '协会'; empty.statement = '声明'
    expect(draftProblems(empty, true).obtainedAt).toContain('有效')
  })

  it('提交载荷去掉首尾空白；编辑携带版本；材料范围决定上传目标', () => {
    const draft = draftFrom(record)
    draft.certificateNumber = '  A-1  '
    draft.statement = '  声明  '
    expect(createBodyFrom(draft)).toMatchObject({
      scope: { type: 'organization', organizationId: 'o1' }, certificateNumber: 'A-1', statement: '声明', obtainedAt: null,
    })
    expect(updateBodyFrom(draft, 3)).toMatchObject({ expectedVersion: 3, evidenceMediaIds: ['m1'] })
    expect(uploadOptionsFor({ scopeType: 'organization', organizationId: 'o1' })).toEqual({
      purpose: 'certification_evidence', target: { type: 'organization', id: 'o1' },
    })
    expect(uploadOptionsFor({ scopeType: 'platform', organizationId: null })).toEqual({ purpose: 'certification_evidence' })
  })

  it('决定选项随状态收敛，待复核申诉只认 pending', () => {
    expect(reviewDecisionOptions('under_review').map((item) => item.value)).toEqual(['approve', 'reject', 'needs_more_information'])
    expect(reviewDecisionOptions('approved').map((item) => item.value)).toEqual(['suspend', 'revoke'])
    expect(reviewDecisionOptions('suspended').map((item) => item.value)).toEqual(['resume', 'revoke'])
    expect(reviewDecisionOptions('rejected')).toEqual([])
    expect(appealDecisionOptions().map((item) => item.value)).toEqual(['uphold', 'overturn', 'needs_more_information'])
    expect(pendingAppeal([{ ...appeal, status: 'decided' }])).toBeNull()
    expect(pendingAppeal([appeal])).toEqual(appeal)
    expect(applicantTag('1234567890')).toBe('申请人 12345678')
  })

  it('错误文案区分离线、冲突与自审', () => {
    expect(certificationErrorMessage(new CertificationsApiError('OFFLINE', 0))).toContain('未提交')
    expect(certificationErrorMessage(new CertificationsApiError('VERSION_CONFLICT', 409))).toContain('重新读取')
    expect(certificationErrorMessage(new CertificationsApiError('CERTIFICATION_SELF_REVIEW', 403))).toContain('本人')
  })
})

describe('本人认证用例', () => {
  it('固定范围的新建表单不能切换到平台或其他组织，载荷沿用入口范围', () => {
    const renderer = createRenderer<Record<string, unknown>, Record<string, unknown>>({
      createElement: () => ({}), createText: () => ({}), createComment: () => ({}), insert() {}, remove() {},
      setText() {}, setElementText() {}, parentNode: () => null, nextSibling: () => null, patchProp() {},
    })
    let form!: ReturnType<typeof useCertificationForm>
    const app = renderer.createApp(defineComponent({ setup() {
      form = useCertificationForm({ initial: null, organizations: [organization()], takenOrganizationIds: [],
        platformTaken: false, platformEligible: true, editing: false, busy: false, error: '',
        fixedScope: { type: 'organization', organizationId: 'o1' } }, vi.fn(), vi.fn())
      return () => null
    } }))
    vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {} })
    try {
      app.mount({})
      form.changeScope('platform', null)
      form.changeScope('organization', 'o2')
      expect(form.draft.fields.scopeType).toBe('organization')
      expect(form.draft.fields.organizationId).toBe('o1')
      expect(createBodyFrom(form.draft.fields).scope).toEqual({ type: 'organization', organizationId: 'o1' })
      app.unmount()
    } finally { vi.unstubAllGlobals() }
  })

  it('完整读取分页摘要后隔离平台与当前组织，资格不依赖当前页', async () => {
    const platform: CertificationSummary = { ...summary, id: 'cp', scope: { type: 'platform', organizationId: null } }
    const prerequisite: CertificationSummary = { ...summary, id: 'c2', scope: { type: 'organization', organizationId: 'o2' }, effectiveStatus: 'approved' }
    const a = api({ mine: vi.fn(async ({ page: current }: { page: string }) => ({
      items: [[summary], [platform], [prerequisite]][Number(current) - 1] ?? [], total: 3, page: Number(current), pageSize: 1,
    })) })
    const c = useCertifications(a, org(), { type: 'platform', organizationId: null })
    await c.load()
    expect(c.items.value).toEqual([platform])
    expect(c.platformEligible.value).toBe(true)
    expect(a.mine).toHaveBeenCalledTimes(3)
    expect(await c.open(summary)).toBe(false)
    expect(a.detail).not.toHaveBeenCalled()
    const o = useCertifications(a, org(), { type: 'organization', organizationId: 'o1' })
    await o.load()
    expect(o.items.value).toEqual([summary])
    expect(await o.open(platform)).toBe(false)
  })

  it('平台记录始终可查看，前置组织认证失效不隐藏已保存的平台申请', async () => {
    const platform = { ...record, scope: { type: 'platform' as const, organizationId: null } }
    const a = api({ mine: vi.fn(async () => page([platform])), detail: vi.fn(async () => platform) })
    const c = useCertifications(a, org(), platform.scope)
    await c.load()
    expect(c.platformEligible.value).toBe(false)
    expect(c.items.value).toHaveLength(1)
    expect(await c.open(platform)).toBe(true)
    expect(c.selectedRecord.value).toEqual(platform)
  })

  it('保存后提交使用返回版本；部分成功保留原记录，不伪报已提交', async () => {
    const a = api({ create: vi.fn(async () => ({ ...record, version: 7 })), submit: vi.fn(async () => { throw new CertificationsApiError('NETWORK_ERROR', 0) }) })
    const c = useCertifications(a, org())
    const result = await c.saveApplication(createBodyFrom(draftFrom(record)), null, true)
    expect(result).toMatchObject({ ok: false, stored: true, record: { id: 'c1', version: 7 } })
    expect(a.submit).toHaveBeenCalledWith('c1', 7)
    expect(c.selectedRecord.value?.id).toBe('c1')
    expect(c.action.error.value).toContain('材料已保存')
    expect(c.action.done.value).toContain('提交审核尚未确认')
  })

  it('保存草稿后选中新记录并刷新详情；失败不报成功', async () => {
    const a = api(), c = useCertifications(a, org())
    const body = createBodyFrom(draftFrom(record))
    expect(await c.createDraft(body)).toBe(true)
    expect(a.create).toHaveBeenCalledWith(body, expect.any(String))
    expect(c.selectedId.value).toBe('c1')
    expect(a.detail).toHaveBeenCalledWith('c1')
    expect(c.action.done.value).toContain('草稿')
    const failing = api({ create: vi.fn(async () => { throw new CertificationsApiError('CERTIFICATION_EXISTS', 409) }) })
    const c2 = useCertifications(failing, org())
    expect(await c2.createDraft(body)).toBe(false)
    expect(c2.action.error.value).toContain('已有认证')
    expect(c2.action.done.value).toBe('')
  })

  it('补件、提交与申诉分别携带版本，写入成功但刷新失败只提示陈旧', async () => {
    const a = api(), c = useCertifications(a, org())
    await c.open(summary)
    expect(a.detail).toHaveBeenCalledWith('c1')
    expect(await c.updateDraft(record, updateBodyFrom(draftFrom(record), 1))).toBe(true)
    expect(a.update).toHaveBeenCalledWith('c1', expect.objectContaining({ expectedVersion: 1 }))
    expect(await c.submit(record)).toBe(true)
    expect(a.submit).toHaveBeenCalledWith('c1', 1)
    expect(await c.appeal(record, { reason: '请求复核', evidenceMediaIds: [] })).toBe(true)
    expect(a.createAppeal).toHaveBeenCalledWith('c1', { expectedVersion: 1, reason: '请求复核', evidenceMediaIds: [] })
    const staleApi = api({ mine: vi.fn(async () => { throw new CertificationsApiError('NETWORK_ERROR', 0) }) })
    const c2 = useCertifications(staleApi, org())
    await c2.open(summary)
    expect(await c2.submit(record)).toBe(true)
    expect(c2.action.error.value).toBe('')
    expect(c2.stale.value).toContain('不要重复提交')
  })
})

describe('组织审核用例', () => {
  it('审核决定按记录版本提交并刷新两个队列', async () => {
    const a = api(), access = { isCertifier: ref(true), isOwner: ref(true) }
    const r = useReviewQueues(ref('o1'), access, a)
    await r.load()
    expect(a.reviewQueue).toHaveBeenCalledWith('o1', { page: '1', pageSize: '20' })
    expect(a.appealQueue).toHaveBeenCalledWith('o1', { page: '1', pageSize: '20' })
    await r.open(summary)
    expect(await r.decide({ ...record, status: 'under_review' }, 'approve', '材料齐全')).toBe(true)
    expect(a.decide).toHaveBeenCalledWith('o1', 'c1', { expectedVersion: 1, decision: 'approve', reason: '材料齐全' })
    expect(r.action.done.value).toContain('批准')
    expect(a.reviewQueue).toHaveBeenCalledTimes(2)
    expect(a.appealQueue).toHaveBeenCalledTimes(2)
  })

  it('无申诉权限时不请求申诉队列；复核决定携带申诉 ID', async () => {
    const a = api(), access = { isCertifier: ref(false), isOwner: ref(true) }
    const r = useReviewQueues(ref('o1'), access, a)
    await r.load()
    expect(a.reviewQueue).not.toHaveBeenCalled()
    await r.open(summary)
    expect(await r.decideAppeal(record, appeal, 'overturn', '材料属实')).toBe(true)
    expect(a.decideAppeal).toHaveBeenCalledWith('c1', 'a1', { expectedVersion: 1, decision: 'overturn', reason: '材料属实' })
    expect(r.action.done.value).toContain('改判')
  })

  it('负责人复核用申诉 application 入口读取详情，不请求普通详情与历史', async () => {
    const application = vi.fn(async () => ({ ...record, status: 'rejected' }))
    const a = api({ appeals: vi.fn(async () => page([appeal])), appealApplication: application })
    const r = useReviewQueues(ref('o1'), { isCertifier: ref(false), isOwner: ref(true) }, a)
    await r.open(summary)
    expect(application).toHaveBeenCalledWith('c1', 'a1')
    expect(a.detail).not.toHaveBeenCalled()
    expect(a.history).not.toHaveBeenCalled()
    expect(r.record.value?.status).toBe('rejected')
  })

  it('仅有认证员权限时不请求申诉入口', async () => {
    const a = api({ appeals: vi.fn(async () => page([appeal])) })
    const r = useReviewQueues(ref('o1'), { isCertifier: ref(true), isOwner: ref(false) }, a)
    await r.open(summary)
    expect(a.appeals).not.toHaveBeenCalled()
    expect(a.detail).toHaveBeenCalledWith('c1')
    expect(a.history).toHaveBeenCalledWith('c1', { pageSize: '50' })
  })

  it('审核入口只按角色显示，认证员与负责人可同时存在', async () => {
    const orgApi = org({ mine: vi.fn(async () => page([organization({ roles: ['certifier'], isOwner: true })])) })
    const access = useReviewAccess(ref('o1'), orgApi)
    await access.load()
    expect(access.hasAccess.value).toBe(true)
    expect(access.tabs.value.map((item) => item.id)).toEqual(['review', 'records', 'appeal'])
    const ownerOnly = useReviewAccess(ref('o1'), org({ mine: vi.fn(async () => page([organization({ isOwner: true })])) }))
    await ownerOnly.load()
    expect(ownerOnly.tabs.value.map((item) => item.id)).toEqual(['appeal'])
  })
})
