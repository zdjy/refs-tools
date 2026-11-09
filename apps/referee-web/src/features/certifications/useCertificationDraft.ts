import { reactive } from 'vue'
import type {
  Certification, CertificationMaterials, CertificationScope, CreateCertification, QualificationLevel, UpdateCertification,
} from '@refs-tools/contracts/certifications'
import type { UploadOptions } from '../../features/media/direct-upload'

export type CertificationDraft = {
  scopeType: 'organization' | 'platform'
  organizationId: string | null
  level: QualificationLevel
  certificateNumber: string
  issuer: string
  obtainedAt: string
  statement: string
  evidenceMediaIds: string[]
  historyMediaIds: string[]
}
export type CertificationFieldKey = 'scope' | 'organizationId' | 'level' | 'certificateNumber' | 'issuer' | 'obtainedAt' | 'statement' | 'evidence' | 'history'
export const certificationLimits = { certificateNumber: 120, issuer: 200, statement: 2000, media: 10 } as const

export function draftFrom(record: Certification | null): CertificationDraft {
  return {
    scopeType: record?.scope.type ?? 'organization',
    organizationId: record?.scope.type === 'organization' ? record.scope.organizationId : null,
    level: record?.level ?? 'level_3',
    certificateNumber: record?.certificateNumber ?? '',
    issuer: record?.issuer ?? '',
    obtainedAt: record?.obtainedAt ?? '',
    statement: record?.statement ?? '',
    evidenceMediaIds: [...(record?.evidenceMediaIds ?? [])],
    historyMediaIds: [...(record?.historyMediaIds ?? [])],
  }
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/
const validDate = (value: string) => {
  if (!datePattern.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year!, month! - 1, day!))
  // Date 会把 2 月 30 日归一化成 3 月 2 日，回读日期分量才能拒绝不存在的日期。
  return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day
}
const textProblem = (value: string, max: number, label: string) => {
  const text = value.trim()
  if (!text) return `请填写${label}`
  return text.length > max ? `${label}不超过 ${max} 个字符` : ''
}

/** 表单只检查必填、长度、日期格式与材料数量；成员资格、材料归属和版本冲突由服务端裁决。 */
export function draftProblems(draft: CertificationDraft, requireScope: boolean): Partial<Record<CertificationFieldKey, string>> {
  const problems: Partial<Record<CertificationFieldKey, string>> = {}
  if (requireScope) {
    if (draft.scopeType === 'organization' && !draft.organizationId) problems.organizationId = '请选择要申请认证的组织'
  }
  const certificateNumber = textProblem(draft.certificateNumber, certificationLimits.certificateNumber, '证书编号')
  const issuer = textProblem(draft.issuer, certificationLimits.issuer, '发证机构')
  const statement = textProblem(draft.statement, certificationLimits.statement, '个人声明')
  if (certificateNumber) problems.certificateNumber = certificateNumber
  if (issuer) problems.issuer = issuer
  if (statement) problems.statement = statement
  if (draft.obtainedAt && !validDate(draft.obtainedAt)) problems.obtainedAt = '请填写有效的取得日期，或留空'
  if (draft.evidenceMediaIds.length < 1) problems.evidence = '至少上传 1 个证书原件材料'
  if (draft.evidenceMediaIds.length > certificationLimits.media) problems.evidence = `原件材料最多 ${certificationLimits.media} 个`
  if (draft.historyMediaIds.length < 1) problems.history = '至少上传 1 个履历材料'
  if (draft.historyMediaIds.length > certificationLimits.media) problems.history = `履历材料最多 ${certificationLimits.media} 个`
  return problems
}

export function materialsFrom(draft: CertificationDraft): CertificationMaterials {
  return {
    level: draft.level,
    certificateNumber: draft.certificateNumber.trim(),
    issuer: draft.issuer.trim(),
    obtainedAt: draft.obtainedAt.trim() || null,
    evidenceMediaIds: [...draft.evidenceMediaIds],
    historyMediaIds: [...draft.historyMediaIds],
    statement: draft.statement.trim(),
  }
}

export function scopeFrom(draft: CertificationDraft): CertificationScope {
  return draft.scopeType === 'platform'
    ? { type: 'platform', organizationId: null }
    : { type: 'organization', organizationId: draft.organizationId ?? '' }
}

export function createBodyFrom(draft: CertificationDraft): CreateCertification {
  return { scope: scopeFrom(draft), ...materialsFrom(draft) }
}

export function updateBodyFrom(draft: CertificationDraft, expectedVersion: number): UpdateCertification {
  return { ...materialsFrom(draft), expectedVersion }
}

/** 平台认证的证据落在本人范围，组织认证落在当前组织范围；切换范围必须重新上传，避免跨范围复用。 */
export function uploadOptionsFor(draft: Pick<CertificationDraft, 'scopeType' | 'organizationId'>): UploadOptions {
  return draft.scopeType === 'organization' && draft.organizationId
    ? { purpose: 'certification_evidence', target: { type: 'organization', id: draft.organizationId } }
    : { purpose: 'certification_evidence' }
}

/** 表单交互状态：材料数组的新增/移除与范围切换都在这里，组件只绑定值。 */
export function useCertificationDraft(initial: Certification | null = null) {
  const fields = reactive<CertificationDraft>(draftFrom(initial))
  const problems = reactive<Partial<Record<CertificationFieldKey, string>>>({})

  function validate(requireScope: boolean): boolean {
    for (const key of Object.keys(problems) as CertificationFieldKey[]) delete problems[key]
    Object.assign(problems, draftProblems(fields, requireScope))
    return Object.keys(problems).length === 0
  }
  function add(kind: 'evidenceMediaIds' | 'historyMediaIds', mediaId: string) {
    if (fields[kind].length >= certificationLimits.media || fields[kind].includes(mediaId)) return false
    fields[kind].push(mediaId)
    return true
  }
  function remove(kind: 'evidenceMediaIds' | 'historyMediaIds', index: number) {
    fields[kind].splice(index, 1)
  }
  /** 范围一变，此前上传材料的归属就不再匹配，因此清空并要求重新上传。 */
  function changeScope(type: 'organization' | 'platform', organizationId: string | null) {
    const changed = fields.scopeType !== type || fields.organizationId !== organizationId
    fields.scopeType = type
    fields.organizationId = type === 'organization' ? organizationId : null
    if (changed) { fields.evidenceMediaIds.splice(0); fields.historyMediaIds.splice(0) }
  }
  return { fields, problems, validate, add, remove, changeScope }
}
