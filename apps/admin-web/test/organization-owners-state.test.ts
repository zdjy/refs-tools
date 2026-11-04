import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminUser } from '@refs-tools/contracts/admin-users';
import { OrganizationOwnersApiError } from '../src/api/system/organization-owners';
import { useOrganizationOwners } from '../src/views/system/organization/useOrganizationOwners';

const user: AdminUser = { id: 'owner-id', displayName: '裁判甲', email: 'owner@example.com', status: 'active',
  emailVerified: true, createdAt: '2026-11-02T12:00:00Z', version: 1, roles: [] };
function fixture() {
  const api = { list: vi.fn(async () => ({ items: [user], total: 21, page: 1, pageSize: 20 })) };
  return { api, state: useOrganizationOwners(api) };
}
afterEach(() => { vi.useRealTimers(); });

describe('代录组织负责人选择', () => {
  it('查询按昵称或邮箱分页，选择后保留身份，清空时移除绑定', async () => {
    const f = fixture(); await f.state.load();
    expect(f.state.select(user.id)).toBe(user.id);
    f.api.list.mockResolvedValueOnce({ items: [], total: 21, page: 2, pageSize: 20 }); await f.state.load(2);
    expect(f.api.list).toHaveBeenLastCalledWith({ keyword: '', page: '2', pageSize: '20' });
    expect(f.state.selected.value).toEqual(user); expect(f.state.select(null)).toBe(''); expect(f.state.selected.value).toBeNull();
  });
  it('不能把未知、停用或未验证账号设为负责人', async () => {
    const f = fixture(); f.api.list.mockResolvedValueOnce({ items: [{ ...user, emailVerified: false },
      { ...user, id: 'disabled', status: 'disabled' }], total: 2, page: 1, pageSize: 20 });
    await f.state.load();
    for (const id of ['unknown', user.id, 'disabled']) expect(f.state.select(id)).toBe('');
    expect(f.state.selected.value).toBeNull();
  });
  it('搜索防抖且旧请求不能在新搜索等待期间恢复旧候选项', async () => {
    vi.useFakeTimers(); const f = fixture();
    let resolve!: (value: Awaited<ReturnType<typeof f.api.list>>) => void;
    f.api.list.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const old = f.state.load(); f.state.search('旧查询'); f.state.search('owner@example.com');
    resolve({ items: [user], total: 1, page: 1, pageSize: 20 }); await old;
    expect(f.state.users.value).toEqual([]); expect(f.state.loading.value).toBe(true);
    await vi.advanceTimersByTimeAsync(300);
    expect(f.api.list).toHaveBeenCalledTimes(2);
    expect(f.api.list).toHaveBeenLastCalledWith({ keyword: 'owner@example.com', page: '1', pageSize: '20' });
  });
  it('查询失败显示错误且可重试，保留已选负责人', async () => {
    const f = fixture(); await f.state.load(); f.state.select(user.id);
    f.api.list.mockRejectedValueOnce(new OrganizationOwnersApiError('NETWORK_ERROR')); await f.state.load();
    expect(f.state.error.value).toContain('网络'); expect(f.state.users.value).toEqual([]); expect(f.state.selected.value).toEqual(user);
    await f.state.load(); expect(f.state.error.value).toBe(''); expect(f.state.users.value).toEqual([user]);
  });
  it('关闭弹窗清理定时器和私有候选数据，忽略未完成响应', async () => {
    vi.useFakeTimers(); const f = fixture(); await f.state.load(); f.state.select(user.id); f.state.search('待查询');
    f.state.dispose(); await vi.advanceTimersByTimeAsync(300); expect(f.api.list).toHaveBeenCalledTimes(1);
    let resolve!: (value: Awaited<ReturnType<typeof f.api.list>>) => void;
    f.api.list.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const pending = f.state.load(); f.state.dispose(); resolve({ items: [user], total: 1, page: 1, pageSize: 20 }); await pending;
    expect(f.state.users.value).toEqual([]); expect(f.state.selected.value).toBeNull();
  });
});
