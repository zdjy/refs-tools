import { describe, expect, it, vi } from 'vitest';
import type { AdminUser } from '@refs-tools/contracts/admin-users';
import { useUsers } from '../src/views/system/user/useUsers';

function fixture() {
  const user: AdminUser = { id: 'user-id', email: 'ref@example.com', displayName: '裁判', status: 'active',
    emailVerified: true, roles: [], version: 1, createdAt: new Date().toISOString() };
  const api = { list: vi.fn(async () => ({ items: [user], total: 1, page: 1, pageSize: 20 })),
    detail: vi.fn(async () => user), create: vi.fn(async () => user), update: vi.fn(async () => user),
    remove: vi.fn(async () => ({ deleted: true as const })) };
  return { user, api, state: useUsers(api) };
}

describe('用户 CRUD 页面状态', () => {
  it('读取失败不伪装为空列表', async () => {
    const f = fixture(); await f.state.load();
    f.api.list.mockRejectedValue(new Error('读取失败')); await f.state.load();
    expect(f.state.items.value).toHaveLength(1); expect(f.state.error.value).toBe('读取失败');
  });
  it('旧列表响应不覆盖最新筛选', async () => {
    const f = fixture(); let resolve!: (value: Awaited<ReturnType<typeof f.api.list>>) => void;
    f.api.list.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
    const first = f.state.load(); await f.state.load(2);
    resolve({ items: [], total: 0, page: 1, pageSize: 20 }); await first;
    expect(f.state.items.value).toHaveLength(1); expect(f.state.page.value).toBe(2);
  });
  it('创建失败保留输入，成功清除密码', async () => {
    const f = fixture(); f.state.create();
    Object.assign(f.state.form, { email: 'new@example.com', displayName: '新裁判', password: 'safe-password' });
    f.api.create.mockRejectedValueOnce(new Error('邮箱已使用')); await f.state.save();
    expect(f.state.form.password).toBe('safe-password'); expect(f.state.mode.value).toBe('create');
    await f.state.save(); expect(f.state.form.password).toBe(''); expect(f.state.mode.value).toBeNull();
  });
  it('停用必须确认，版本冲突保留表单', async () => {
    const f = fixture(); await f.state.open(f.user, 'edit'); f.state.form.status = 'disabled';
    await f.state.save(); expect(f.state.confirm.value).toBe('disable'); expect(f.api.update).not.toHaveBeenCalled();
    f.api.update.mockRejectedValueOnce(new Error('版本冲突')); await f.state.save(true);
    expect(f.state.formError.value).toBe('版本冲突'); expect(f.state.form.status).toBe('disabled');
  });
  it('详情读取失败不能保存或删除', async () => {
    const f = fixture(); f.api.detail.mockRejectedValue(new Error('读取失败')); await f.state.open(f.user, 'edit');
    await f.state.save(); await f.state.remove();
    expect(f.api.update).not.toHaveBeenCalled(); expect(f.api.remove).not.toHaveBeenCalled();
  });
  it('离线不伪报成功，提交互斥', async () => {
    const f = fixture(); await f.state.open(f.user, 'edit'); f.state.online.value = false;
    await f.state.save(); expect(f.api.update).not.toHaveBeenCalled();
    f.state.online.value = true; let resolve!: (user: AdminUser) => void;
    f.api.update.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
    const first = f.state.save(); await f.state.save(); expect(f.api.update).toHaveBeenCalledTimes(1);
    resolve(f.user); await first;
  });
});
