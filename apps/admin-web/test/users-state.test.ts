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
  it('只读详情不能伪报保存成功', async () => {
    const f = fixture(); await f.state.open(f.user, 'detail'); await f.state.save();
    expect(f.api.update).not.toHaveBeenCalled(); expect(f.state.notice.value).toBe('');
  });
  it('写入失败不发成功通知；写入成功但刷新失败保留成功与陈旧说明', async () => {
    const f = fixture(); f.state.create();
    f.api.create.mockRejectedValueOnce(new Error('写入失败')); await f.state.save();
    expect(f.state.notice.value).toBe('');
    f.api.list.mockRejectedValueOnce(new Error('刷新失败')); await f.state.save();
    expect(f.state.notice.value).toBe('用户已创建'); expect(f.state.error.value).toBe('刷新失败');
    expect(f.state.mode.value).toBeNull();
  });
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
    await f.state.save(); expect(f.state.needsDisableConfirm.value).toBe(true); expect(f.api.update).not.toHaveBeenCalled();
    f.api.update.mockRejectedValueOnce(new Error('版本冲突')); await f.state.save(true);
    expect(f.state.formError.value).toBe('版本冲突'); expect(f.state.form.status).toBe('disabled');
  });
  it('详情读取失败不能保存', async () => {
    const f = fixture(); f.api.detail.mockRejectedValue(new Error('读取失败')); await f.state.open(f.user, 'edit');
    await f.state.save();
    expect(f.api.update).not.toHaveBeenCalled();
  });
  it('行内删除不依赖打开的弹窗，失败写页面横幅且不报成功', async () => {
    const f = fixture(); await f.state.load();
    f.api.remove.mockRejectedValueOnce(new Error('版本冲突')); await f.state.remove(f.user);
    expect(f.state.notice.value).toBe(''); expect(f.state.actionError.value).toBe('版本冲突');
    f.state.online.value = false; await f.state.remove(f.user); expect(f.api.remove).toHaveBeenCalledTimes(1);
    f.state.online.value = true; await f.state.remove(f.user);
    expect(f.state.actionError.value).toBe(''); expect(f.state.notice.value).toBe('用户已删除，历史记录保留');
    expect(f.api.list).toHaveBeenCalled();
  });
  it('行内删除与弹窗互斥，进行中不重复提交', async () => {
    const f = fixture(); await f.state.open(f.user, 'detail');
    let resolve!: (value: { deleted: true }) => void;
    f.api.remove.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
    const first = f.state.remove(f.user);
    await f.state.remove(f.user); f.state.create(); await f.state.open(f.user, 'edit');
    expect(f.api.remove).toHaveBeenCalledTimes(1); expect(f.state.mode.value).toBe('detail');
    resolve({ deleted: true }); await first;
  });
  it('离线不伪报成功，提交互斥', async () => {
    const f = fixture(); await f.state.open(f.user, 'edit'); f.state.online.value = false;
    await f.state.save(); expect(f.api.update).not.toHaveBeenCalled();
    f.state.online.value = true; let resolve!: (user: AdminUser) => void;
    f.api.update.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
    const first = f.state.save(); await f.state.save(); f.state.create(); await f.state.open(f.user, 'detail');
    expect(f.api.update).toHaveBeenCalledTimes(1); expect(f.state.mode.value).toBe('edit');
    resolve(f.user); await first;
  });
});
