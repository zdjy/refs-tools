import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Candidate } from '@refs-tools/contracts/organization-access';
import { MemberCandidatesApiError } from '../src/api/system/member-candidates';
import { useInviteCandidates } from '../src/views/system/organization/useInviteCandidates';

const candidate = (userId: string, displayName = `用户${userId}`): Candidate => ({
  userId,
  displayName,
  tag: userId.slice(-4),
  relation: 'none',
});
type ListResult = { items: Candidate[]; total: number; page: number; pageSize: number };

function fixture() {
  const api = { list: vi.fn(async (): Promise<ListResult> => ({ items: [candidate('member-0001')], total: 1, page: 1, pageSize: 10 })) };
  return { api, state: useInviteCandidates(() => 'org-1', api) };
}

describe('受邀用户检索状态', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('少于 2 个字符不发请求，足够长度才按输入检索', async () => {
    const f = fixture();
    f.state.search('张');
    await vi.advanceTimersByTimeAsync(400);
    expect(f.api.list).not.toHaveBeenCalled();
    f.state.search(' 张三 ');
    expect(f.state.loading.value).toBe(true);
    await vi.advanceTimersByTimeAsync(300);
    expect(f.api.list).toHaveBeenCalledWith('org-1', '张三', '1');
    expect(f.state.candidates.value).toHaveLength(1);
    expect(f.state.loading.value).toBe(false);
  });

  it('旧响应不会覆盖新检索，清空会丢弃候选与关键词', async () => {
    const f = fixture();
    let resolveFirst!: (value: ListResult) => void;
    f.api.list.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }));
    f.state.search('旧关键词');
    await vi.advanceTimersByTimeAsync(300);
    f.state.search('新关键词');
    await vi.advanceTimersByTimeAsync(300);
    expect(f.state.candidates.value[0]?.userId).toBe('member-0001');
    resolveFirst({ items: [candidate('stale-9999')], total: 1, page: 1, pageSize: 10 });
    await Promise.resolve();
    expect(f.state.candidates.value[0]?.userId).toBe('member-0001');
    f.state.clear();
    expect(f.state.keyword.value).toBe('');
    expect(f.state.candidates.value).toEqual([]);
    expect(f.state.total.value).toBe(0);
  });

  it('失败显示上下文错误码文案并清空候选，重试沿用当前关键词', async () => {
    const f = fixture();
    f.api.list.mockRejectedValueOnce(new MemberCandidatesApiError('FORBIDDEN', 403));
    f.state.search('张三');
    await vi.advanceTimersByTimeAsync(300);
    expect(f.state.error.value).toContain('成员管理权限');
    expect(f.state.candidates.value).toEqual([]);
    f.state.search('张三');
    await vi.advanceTimersByTimeAsync(300);
    expect(f.state.error.value).toBe('');
    expect(f.state.candidates.value).toHaveLength(1);
    f.api.list.mockRejectedValueOnce(new MemberCandidatesApiError('NETWORK_ERROR', 0));
    await f.state.load();
    expect(f.state.error.value).toContain('网络');
  });
});
