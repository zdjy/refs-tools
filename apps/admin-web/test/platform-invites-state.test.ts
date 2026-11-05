import { describe, expect, it, vi } from 'vitest';
import type { PlatformInvite } from '@refs-tools/contracts/platform-invites';
import { PlatformInvitesApiError } from '../src/api/system/platform-invites';
import { usePlatformInvites } from '../src/views/system/organization/usePlatformInvites';

const token = `ro_${'A'.repeat(43)}`;
function fixture() {
  const invite: PlatformInvite = { id: 'invite-id', hint: 'AAAA', status: 'active', version: 1, createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(), usedOrganizationId: null, usedAt: null };
  const api = { list: vi.fn(async () => ({ items: [invite], total: 1, page: 1, pageSize: 20 })),
    create: vi.fn(async () => ({ invite, token })), revoke: vi.fn(async () => ({ ...invite, status: 'revoked' as const, version: 2 })) };
  return { invite, api, state: usePlatformInvites(api) };
}

describe('平台邀请码面板状态', () => {
  it('打开时读取列表；读取失败保留错误并可重试，不伪装为空列表', async () => {
    const f = fixture(); f.api.list.mockRejectedValueOnce(new PlatformInvitesApiError('NETWORK_ERROR', 0));
    await f.state.show(); expect(f.state.error.value).toContain('网络'); expect(f.state.ready.value).toBe(false)
    await f.state.load(1); expect(f.state.items.value).toHaveLength(1); expect(f.state.ready.value).toBe(true);
  });
  it('生成后明文只在内存展示一次，关闭展示块或面板即清除', async () => {
    const f = fixture(); await f.state.show(); await f.state.create();
    expect(f.api.create).toHaveBeenCalledWith({ validDays: 3 }); expect(f.state.token.value).toBe(token);
    expect(f.state.notice.value).toContain('仅显示一次');
    f.state.dismissToken(); expect(f.state.token.value).toBe('');
    await f.state.create(); expect(f.state.token.value).toBe(token);
    f.state.close(); expect(f.state.token.value).toBe(''); expect(f.state.items.value).toEqual([]);
  });
  it('有效期越界或非整数不提交', async () => {
    const f = fixture(); await f.state.show();
    for (const value of [0, 8, 2.5, null]) { f.state.validDays.value = value; await f.state.create(); }
    expect(f.api.create).not.toHaveBeenCalled(); expect(f.state.error.value).toContain('1–7');
  });
  it('生成失败不报成功也不留明文，且保留可重试状态', async () => {
    const f = fixture(); await f.state.show();
    f.api.create.mockRejectedValueOnce(new PlatformInvitesApiError('FORBIDDEN', 403)); await f.state.create();
    expect(f.state.token.value).toBe(''); expect(f.state.notice.value).toBe(''); expect(f.state.error.value).toContain('权限');
    expect(f.state.busy.value).toBe(false);
  });
  it('写入成功但刷新失败：保留成功事实与明文，只提示列表陈旧而不报失败', async () => {
    const f = fixture(); await f.state.show();
    f.api.list.mockRejectedValueOnce(new PlatformInvitesApiError('NETWORK_ERROR', 0)); await f.state.create();
    expect(f.state.token.value).toBe(token); expect(f.state.notice.value).toContain('已生成');
    expect(f.state.staleNote.value).toContain('刷新失败'); expect(f.state.error.value).toBe('');
  });
  it('撤销需先选择再确认，只带当前版本；成功后刷新并给出结果', async () => {
    const f = fixture(); await f.state.show(); f.state.requestRevoke(f.invite);
    expect(f.state.revoking.value).toEqual(f.invite); expect(f.api.revoke).not.toHaveBeenCalled();
    await f.state.revoke(); expect(f.api.revoke).toHaveBeenCalledWith('invite-id', { expectedVersion: 1 });
    expect(f.state.notice.value).toBe('邀请码已撤销'); expect(f.state.revoking.value).toBeNull();
  });
  it('只有可使用的码能进入撤销；版本冲突保留错误并要求重新读取', async () => {
    const f = fixture(); await f.state.show(); f.state.requestRevoke({ ...f.invite, status: 'used' });
    expect(f.state.revoking.value).toBeNull();
    f.state.requestRevoke(f.invite); f.api.revoke.mockRejectedValueOnce(new PlatformInvitesApiError('VERSION_CONFLICT', 409)); await f.state.revoke();
    expect(f.state.error.value).toContain('重新读取'); expect(f.state.notice.value).toBe('');
  });
  it('复制成功如实提示；浏览器拒绝时说明手动复制，不假装已复制', async () => {
    const f = fixture(); await f.state.show(); await f.state.create();
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { onLine: true, clipboard: { writeText } });
    try {
      await f.state.copyToken(); expect(writeText).toHaveBeenCalledWith(token); expect(f.state.copyNotice.value).toContain('已复制');
      writeText.mockRejectedValueOnce(new Error('denied')); await f.state.copyToken();
      expect(f.state.copyNotice.value).toContain('手动复制');
      f.state.dismissToken(); expect(f.state.copyNotice.value).toBe('');
    } finally { vi.unstubAllGlobals(); }
  });
  it('旧列表响应不能覆盖面板关闭后的状态', async () => {
    const f = fixture(); let resolve!: (value: Awaited<ReturnType<typeof f.api.list>>) => void;
    f.api.list.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const opening = f.state.show(); f.state.close(); resolve({ items: [f.invite], total: 1, page: 1, pageSize: 20 }); await opening;
    expect(f.state.items.value).toEqual([]); expect(f.state.open.value).toBe(false);
  });
});
