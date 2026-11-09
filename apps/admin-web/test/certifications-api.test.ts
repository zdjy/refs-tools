import { describe, expect, it, vi } from 'vitest';
import { AdminApiError, type PlatformClient } from '../src/api/http/platform-client';
import { CertificationsApiError, createCertificationsApi } from '../src/api/system/certifications';
const client = () => ({ get: vi.fn(async () => ({})), post: vi.fn(async () => ({})) } as unknown as PlatformClient);
describe('平台认证网关', () => {
  it('分页筛选和范围路径编码，材料不借用治理下载入口', async () => {
    const c = client(), a = createCertificationsApi(c);
    await a.queue('records', { page: '2', pageSize: '20', status: 'approved' });
    await a.queue('review'); await a.queue('appeal');
    await a.evidence('c/1', 'm/1', 'a/1');
    await a.decide('c/1', { expectedVersion: 3, decision: 'suspend', reason: '暂停核查' });
    expect(c.get).toHaveBeenCalledWith('/admin/certifications?page=2&pageSize=20&status=approved');
    expect(c.get).toHaveBeenCalledWith('/admin/certifications/review-queue');
    expect(c.get).toHaveBeenCalledWith('/admin/certifications/appeal-queue');
    expect(c.get).toHaveBeenCalledWith('/certifications/c%2F1/appeals/a%2F1/evidence/m%2F1/read-url');
    expect(c.post).toHaveBeenCalledWith('/admin/certifications/c%2F1/decision', { expectedVersion: 3, decision: 'suspend', reason: '暂停核查' });
  });
  it.each([['OFFLINE', 0], ['VERSION_CONFLICT', 409], [null, 0]])('传输错误不向业务层泄漏原文 %s', async (code, status) => {
    const c = client(); vi.mocked(c.get).mockRejectedValue(new AdminApiError('敏感原文', code, status));
    const error = await createCertificationsApi(c).queue('review').catch(cause => cause);
    expect(error).toBeInstanceOf(CertificationsApiError); expect(error.message).not.toContain('敏感原文');
    expect(error.code).toBe(code ?? 'NETWORK_ERROR');
  });
});
