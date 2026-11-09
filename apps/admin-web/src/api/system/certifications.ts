import type { Certification, CertificationAppeal, CertificationAppealDecision, CertificationDecision, CertificationHistory,
  CertificationRecordsQuery, CertificationReviewSummary } from '@refs-tools/contracts/certifications';
import type { Paged, PageQuery } from '@refs-tools/contracts/pagination';
import type { ReadAuthorization } from '@refs-tools/contracts/media';
import { AdminApiError, platformClient, type PlatformClient } from '../http/platform-client';

/** 认证网关不向表现层泄漏原始响应或异常。 */
export class CertificationsApiError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code); }
}
const id = encodeURIComponent;
const query = (value: PageQuery | CertificationRecordsQuery = {}) => {
  const params = new URLSearchParams();
  for (const [key, item] of Object.entries(value)) if (item) params.set(key, item);
  return params.size ? `?${params}` : '';
};
/** 平台认证只走平台范围队列，材料使用认证专用短时授权。 */
export function createCertificationsApi(client: PlatformClient) {
  const call = <T>(task: Promise<T>) => task.catch(error => {
    throw new CertificationsApiError(error instanceof AdminApiError ? error.code ?? (error.status === 0 ? 'NETWORK_ERROR' : 'SERVICE_UNAVAILABLE') : 'SERVICE_UNAVAILABLE', error instanceof AdminApiError ? error.status : 0);
  });
  return {
    queue: (mode: 'review' | 'appeal' | 'records', value: CertificationRecordsQuery = {}) =>
      call(client.get<Paged<CertificationReviewSummary>>(`/admin/certifications${mode === 'records' ? '' : mode === 'review' ? '/review-queue' : '/appeal-queue'}${query(value)}`)),
    detail: (recordId: string) => call(client.get<Certification>(`/certifications/${id(recordId)}`)),
    history: (recordId: string, value: PageQuery = {}) => call(client.get<Paged<CertificationHistory>>(`/certifications/${id(recordId)}/history${query(value)}`)),
    appeals: (recordId: string, value: PageQuery = {}) => call(client.get<Paged<CertificationAppeal>>(`/certifications/${id(recordId)}/appeals${query(value)}`)),
    application: (recordId: string, appealId: string) => call(client.get<Certification>(`/certifications/${id(recordId)}/appeals/${id(appealId)}/application`)),
    decide: (recordId: string, body: CertificationDecision) => call(client.post<Certification>(`/admin/certifications/${id(recordId)}/decision`, body)),
    decideAppeal: (recordId: string, appealId: string, body: CertificationAppealDecision) => call(client.post<CertificationAppeal>(`/certifications/${id(recordId)}/appeals/${id(appealId)}/decision`, body)),
    evidence: (recordId: string, mediaId: string, appealId?: string) => call(client.get<ReadAuthorization>(
      `/certifications/${id(recordId)}${appealId ? `/appeals/${id(appealId)}` : ''}/evidence/${id(mediaId)}/read-url`)),
  };
}
export const certificationsApi = createCertificationsApi(platformClient);
export type CertificationsApi = typeof certificationsApi;
