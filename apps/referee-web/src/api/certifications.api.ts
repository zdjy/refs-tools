import type {
  Certification, CertificationAppeal, CertificationAppealDecision, CertificationDecision, CertificationHistory,
  CertificationSummary, CreateCertification, CreateCertificationAppeal, UpdateCertification,
} from '@refs-tools/contracts/certifications'
import type { ReadAuthorization } from '@refs-tools/contracts/media'
import type { Paged, PageQuery } from '@refs-tools/contracts/pagination'
import { HttpError } from './http/errors'
import { createPlatformClient, type PlatformClient } from './http/platform-client'

/** 认证上下文只暴露可识别错误码，不携带服务端异常文本、材料编号或签名 URL。 */
export class CertificationsApiError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code) }
}

function toCertificationsError(error: unknown): CertificationsApiError {
  if (!(error instanceof HttpError)) return new CertificationsApiError('SERVICE_UNAVAILABLE', 0)
  if (error.kind === 'offline') return new CertificationsApiError('OFFLINE', 0)
  if (error.kind === 'network') return new CertificationsApiError('NETWORK_ERROR', 0)
  return new CertificationsApiError(error.code ?? 'SERVICE_UNAVAILABLE', error.status)
}

const id = encodeURIComponent
function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') search.set(key, String(value))
  const text = search.toString()
  return text ? `?${text}` : ''
}
const page = (value: PageQuery = {}) => query({ page: value.page, pageSize: value.pageSize })

/**
 * 认证限界上下文网关。路径参数逐段编码；创建携带幂等键；材料读取只用认证专用入口，
 * 不借用通用媒体下载（ADR 0036）。
 */
export function createCertificationsApi(client: PlatformClient) {
  const call = <T>(task: Promise<T>) => task.catch((error) => { throw toCertificationsError(error) })
  return {
    mine: (value: PageQuery = {}) => call(client.get<Paged<CertificationSummary>>(`/me/certifications${page(value)}`)),
    create: (body: CreateCertification, key: string) =>
      call(client.post<Certification>('/certifications', body, { 'Idempotency-Key': key })),
    detail: (recordId: string) => call(client.get<Certification>(`/certifications/${id(recordId)}`)),
    update: (recordId: string, body: UpdateCertification) =>
      call(client.patch<Certification>(`/certifications/${id(recordId)}`, body)),
    submit: (recordId: string, expectedVersion: number) =>
      call(client.post<Certification>(`/certifications/${id(recordId)}/submit`, { expectedVersion })),
    history: (recordId: string, value: PageQuery = {}) =>
      call(client.get<Paged<CertificationHistory>>(`/certifications/${id(recordId)}/history${page(value)}`)),
    reviewQueue: (orgId: string, value: PageQuery = {}) =>
      call(client.get<Paged<CertificationSummary>>(`/organizations/${id(orgId)}/certifications/review-queue${page(value)}`)),
    appealQueue: (orgId: string, value: PageQuery = {}) =>
      call(client.get<Paged<CertificationSummary>>(`/organizations/${id(orgId)}/certifications/appeal-queue${page(value)}`)),
    decide: (orgId: string, recordId: string, body: CertificationDecision) =>
      call(client.post<Certification>(`/organizations/${id(orgId)}/certifications/${id(recordId)}/decision`, body)),
    appeals: (recordId: string, value: PageQuery = {}) =>
      call(client.get<Paged<CertificationAppeal>>(`/certifications/${id(recordId)}/appeals${page(value)}`)),
    createAppeal: (recordId: string, body: CreateCertificationAppeal) =>
      call(client.post<CertificationAppeal>(`/certifications/${id(recordId)}/appeals`, body)),
    appealApplication: (recordId: string, appealId: string) =>
      call(client.get<Certification>(`/certifications/${id(recordId)}/appeals/${id(appealId)}/application`)),
    decideAppeal: (recordId: string, appealId: string, body: CertificationAppealDecision) =>
      call(client.post<CertificationAppeal>(`/certifications/${id(recordId)}/appeals/${id(appealId)}/decision`, body)),
    evidenceUrl: (recordId: string, mediaId: string) =>
      call(client.get<ReadAuthorization>(`/certifications/${id(recordId)}/evidence/${id(mediaId)}/read-url`)),
    appealEvidenceUrl: (recordId: string, appealId: string, mediaId: string) =>
      call(client.get<ReadAuthorization>(`/certifications/${id(recordId)}/appeals/${id(appealId)}/evidence/${id(mediaId)}/read-url`)),
  }
}

export const certificationsApi = createCertificationsApi(createPlatformClient({ baseURL: '/api/v1' }))
export type CertificationsApi = typeof certificationsApi
