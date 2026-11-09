import { describe, expect, it, vi } from 'vitest';
import type { Certification, CertificationReviewSummary } from '@refs-tools/contracts/certifications';
import { useCertifications } from '../src/views/system/certification/useCertifications';
import { CertificationsApiError, type CertificationsApi } from '../src/api/system/certifications';
const page = <T>(items: T[]) => ({ items, total: items.length, page: 1, pageSize: 20 });
const record = { id: 'c1', subjectUserId: 'u1', scope: { type: 'platform', organizationId: null }, status: 'under_review', effectiveStatus: 'under_review', version: 2 } as Certification;
const summary = { ...record, applicant: { nickname: '裁判', legalName: '张三' } } as CertificationReviewSummary;
const api = (patch = {}) => ({ queue: vi.fn(async () => page([summary])), detail: vi.fn(async () => record), appeals: vi.fn(async () => page([])),
  history: vi.fn(async () => page([])), decide: vi.fn(async () => ({ ...record, status: 'approved', version: 3 })), ...patch } as unknown as CertificationsApi);
describe('平台认证审核状态', () => {
  it('分页筛选透传；提交中禁止切换，决定后停留结果', async () => {
    const a = api(), c = useCertifications(a);
    await c.changeTab('records'); c.status.value = 'approved'; await c.load(2);
    expect(a.queue).toHaveBeenLastCalledWith('records', { page: '2', pageSize: '20', status: 'approved' });
    await c.open(summary); c.busy.value = true; await c.open({ ...summary, id: 'other' });
    expect(c.selected.value?.id).toBe('c1'); c.busy.value = false;
    expect(await c.decide('approve', '核验通过')).toBe(true);
    expect(a.decide).toHaveBeenCalledWith('c1', { expectedVersion: 2, decision: 'approve', reason: '核验通过' });
    expect(c.selected.value?.id).toBe('c1'); expect(c.notice.value).toContain('批准');
  });
  it('写入成功刷新失败只提示陈旧，失败不报成功', async () => {
    const a = api(), c = useCertifications(a); await c.open(summary);
    vi.mocked(a.queue).mockRejectedValue(new CertificationsApiError('NETWORK_ERROR', 0));
    expect(await c.decide('approve', '通过')).toBe(true); expect(c.stale.value).toContain('不要重复提交'); expect(c.formError.value).toBe('');
    vi.mocked(a.decide).mockRejectedValue(new CertificationsApiError('VERSION_CONFLICT', 409));
    expect(await c.decide('approve', '通过')).toBe(false); expect(c.notice.value).toBe(''); expect(c.formError.value).toContain('重新读取');
  });
  it('快速切换后旧申诉读取不能覆盖新详情', async () => {
    let release!: (value: ReturnType<typeof page>) => void;
    const a = api({ appeals: vi.fn().mockImplementationOnce(() => new Promise(resolve => { release = resolve; })).mockResolvedValue(page([])) });
    const c = useCertifications(a), first = c.open(summary);
    vi.mocked(a.detail).mockResolvedValue({ ...record, id: 'c2' }); await c.open({ ...summary, id: 'c2' }); release(page([])); await first;
    expect(c.record.value?.id).toBe('c2'); expect(a.detail).not.toHaveBeenCalledWith('c1');
  });
});
