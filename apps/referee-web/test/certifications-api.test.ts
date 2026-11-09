import { describe, expect, it, vi } from 'vitest'
import { HttpError } from '../src/api/http/errors'
import type { PlatformClient } from '../src/api/http/platform-client'
import { CertificationsApiError, createCertificationsApi } from '../src/api/certifications.api'
import { certificationErrorMessage, certificationLoadErrorMessage } from '../src/features/certifications/certifications.presentation'

const platform = (): PlatformClient => ({
  get: vi.fn(async () => ({})), post: vi.fn(async () => ({})), patch: vi.fn(async () => ({})),
} as unknown as PlatformClient)

describe('认证网关错误翻译', () => {
  it.each([
    [new HttpError('offline', null, 0), 'OFFLINE', 0],
    [new HttpError('network', null, 0), 'NETWORK_ERROR', 0],
    [new HttpError('http', 'VERSION_CONFLICT', 409), 'VERSION_CONFLICT', 409],
    [new HttpError('http', null, 502), 'SERVICE_UNAVAILABLE', 502],
    [new HttpError('invalid-response', null, 200), 'SERVICE_UNAVAILABLE', 200],
    [new Error('token=secret'), 'SERVICE_UNAVAILABLE', 0],
  ])('%s -> %s', async (cause, code, status) => {
    const client = platform()
    vi.mocked(client.get).mockRejectedValue(cause)
    const error = await createCertificationsApi(client).mine().catch((e) => e)
    expect(error).toBeInstanceOf(CertificationsApiError)
    expect(error).toMatchObject({ code, status })
    expect(certificationErrorMessage(error)).not.toContain('secret')
  })

  it('写操作说明未提交或需先核对，读操作不暗示已写入', () => {
    expect(certificationErrorMessage(new CertificationsApiError('OFFLINE', 0))).toContain('未提交')
    expect(certificationErrorMessage(new CertificationsApiError('OFFLINE', 0))).toContain('输入已保留')
    expect(certificationErrorMessage(new CertificationsApiError('NETWORK_ERROR', 0))).toContain('先刷新确认')
    expect(certificationLoadErrorMessage(new CertificationsApiError('NETWORK_ERROR', 0))).not.toContain('提交')
  })
})

describe('认证网关路径、方法与请求头', () => {
  it('本人列表与分页参数经 URLSearchParams 编码；创建携带幂等键', async () => {
    const client = platform(), api = createCertificationsApi(client)
    await api.mine({ page: '2', pageSize: '20' })
    await api.create({
      scope: { type: 'organization', organizationId: 'o/1' }, level: 'level_1', certificateNumber: 'A 1', issuer: '协会',
      obtainedAt: null, evidenceMediaIds: ['m1'], historyMediaIds: ['m2'], statement: '声明',
    }, 'key-1')
    expect(client.get).toHaveBeenNthCalledWith(1, '/me/certifications?page=2&pageSize=20')
    expect(client.post).toHaveBeenCalledWith('/certifications', expect.objectContaining({
      scope: { type: 'organization', organizationId: 'o/1' }, statement: '声明',
    }), { 'Idempotency-Key': 'key-1' })
  })

  it('详情、补件、提交、历史与申诉使用认证专用路径', async () => {
    const client = platform(), api = createCertificationsApi(client)
    await api.detail('c/1')
    await api.update('c/1', {
      level: 'level_2', certificateNumber: 'B', issuer: '协会', obtainedAt: null,
      evidenceMediaIds: ['m1'], historyMediaIds: ['m2'], statement: '补充', expectedVersion: 2,
    })
    await api.submit('c/1', 3)
    await api.history('c/1', { pageSize: '50' })
    await api.appeals('c/1')
    await api.createAppeal('c/1', { expectedVersion: 3, reason: '请求复核', evidenceMediaIds: ['m3'] })
    await api.appealApplication('c/1', 'a/1')
    await api.decideAppeal('c/1', 'a/1', { expectedVersion: 4, decision: 'overturn', reason: '材料属实' })
    expect(client.get).toHaveBeenCalledWith('/certifications/c%2F1')
    expect(client.get).toHaveBeenCalledWith('/certifications/c%2F1/history?pageSize=50')
    expect(client.get).toHaveBeenCalledWith('/certifications/c%2F1/appeals')
    expect(client.get).toHaveBeenCalledWith('/certifications/c%2F1/appeals/a%2F1/application')
    expect(client.patch).toHaveBeenCalledWith('/certifications/c%2F1', expect.objectContaining({ expectedVersion: 2 }))
    expect(client.post).toHaveBeenCalledWith('/certifications/c%2F1/submit', { expectedVersion: 3 })
    expect(client.post).toHaveBeenCalledWith('/certifications/c%2F1/appeals', { expectedVersion: 3, reason: '请求复核', evidenceMediaIds: ['m3'] })
    expect(client.post).toHaveBeenCalledWith('/certifications/c%2F1/appeals/a%2F1/decision', { expectedVersion: 4, decision: 'overturn', reason: '材料属实' })
  })

  it('组织审核队列与决定按组织范围编码；材料只走认证读取入口', async () => {
    const client = platform(), api = createCertificationsApi(client)
    await api.reviewQueue('o/1', { page: '1', pageSize: '20' })
    await api.appealQueue('o/1')
    await api.records('o/1', { page: '2', pageSize: '20', status: 'approved' })
    await api.decide('o/1', 'c/1', { expectedVersion: 5, decision: 'approve', reason: '材料齐全' })
    await api.evidenceUrl('c/1', 'm/1')
    await api.appealEvidenceUrl('c/1', 'a/1', 'm/1')
    expect(client.get).toHaveBeenCalledWith('/organizations/o%2F1/certifications/review-queue?page=1&pageSize=20')
    expect(client.get).toHaveBeenCalledWith('/organizations/o%2F1/certifications/appeal-queue')
    expect(client.get).toHaveBeenCalledWith('/organizations/o%2F1/certifications?page=2&pageSize=20&status=approved')
    expect(client.post).toHaveBeenCalledWith('/organizations/o%2F1/certifications/c%2F1/decision', { expectedVersion: 5, decision: 'approve', reason: '材料齐全' })
    expect(client.get).toHaveBeenCalledWith('/certifications/c%2F1/evidence/m%2F1/read-url')
    expect(client.get).toHaveBeenCalledWith('/certifications/c%2F1/appeals/a%2F1/evidence/m%2F1/read-url')
  })
})
