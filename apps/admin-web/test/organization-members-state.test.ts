import { describe, expect, it, vi } from 'vitest';
import { useOrganizationMembers } from '../src/views/system/organization/useOrganizationMembers';
import { OrganizationMembersApiError } from '../src/api/system/organization-members';

function fixture() {
  const org = { id: 'org', name: '协会', region: '', purpose: '', ownerUserId: 'owner', status: 'active' as const, createdAt: '', version: 1 };
  const m = { items: [], total: 0, page: 1, pageSize: 20, canManage: true };
  const api = { members: vi.fn(async () => m), invitations: vi.fn(async () => m), invite: vi.fn(), revoke: vi.fn(), decide: vi.fn() };
  return { org, api, state: useOrganizationMembers(api) };
}
describe('组织成员页面状态', () => {
  it('关闭清除输入，关闭前发出的响应不能覆盖新组织', async () => {
    const f = fixture(); let resolve!: (value: Awaited<ReturnType<typeof f.api.members>>) => void;
    f.api.members.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const opening = f.state.open(f.org); f.state.close(); await f.state.open({ ...f.org, id: 'other' });
    resolve({ items: [], total: 99, page: 1, pageSize: 20, canManage: true }); await opening;
    expect(f.state.organization.value?.id).toBe('other'); expect(f.state.memberTotal.value).toBe(0);
    f.state.userId.value = 'private'; f.state.close(); expect(f.state.userId.value).toBe('');
  });
  it('只读、离线、未就绪或未选人时不能邀请；失败保留输入', async () => {
    const f = fixture(); await f.state.open(f.org);
    f.state.canManage.value = false; await f.state.invite(); expect(f.api.invite).not.toHaveBeenCalled();
    f.state.canManage.value = true; f.state.online.value = false; await f.state.invite(); expect(f.api.invite).not.toHaveBeenCalled();
    f.state.online.value = true; f.state.validDays.value = 7; await f.state.invite();
    expect(f.api.invite).not.toHaveBeenCalled(); expect(f.state.error.value).toContain('选择');
    f.state.userId.value = 'picked-user';
    f.api.invite.mockRejectedValueOnce(new OrganizationMembersApiError('INVALID_MEMBER', 422));
    await f.state.invite(); expect(f.state.userId.value).not.toBe(''); expect(f.state.error.value).toContain('有效');
    await f.state.invite(); expect(f.state.userId.value).toBe(''); expect(f.state.notice.value).toContain('等待');
  });
  it('成员决定需要理由和确认，冲突锁定提交直到重新读取', async () => {
    const f = fixture(); await f.state.open(f.org);
    f.state.select({ kind: 'remove', id: 'member', version: 1, name: '成员' });
    f.state.requestConfirm(); expect(f.state.confirming.value).toBe(false);
    f.state.reason.value = '离开协会'; await f.state.commit(); expect(f.api.decide).not.toHaveBeenCalled();
    f.state.requestConfirm(); f.api.decide.mockRejectedValueOnce(new OrganizationMembersApiError('VERSION_CONFLICT', 409));
    await f.state.commit(); expect(f.state.ready.value).toBe(false); expect(f.state.reason.value).toBe('离开协会');
    f.state.requestConfirm(); expect(f.state.confirming.value).toBe(false);
  });
  it('提交互斥且提交期间不能关闭；读取失败不会当作空列表成功', async () => {
    const f = fixture(); await f.state.open(f.org); f.state.userId.value = 'picked-user';
    let resolve!: () => void; f.api.invite.mockImplementationOnce(() => new Promise<void>(r => { resolve = r; }));
    const first = f.state.invite(); await f.state.invite(); f.state.close();
    expect(f.api.invite).toHaveBeenCalledTimes(1); expect(f.state.organization.value).not.toBeNull();
    resolve(); await first;
    f.api.members.mockRejectedValueOnce(new OrganizationMembersApiError('NETWORK_ERROR', 0)); await f.state.load();
    expect(f.state.ready.value).toBe(false); expect(f.state.error.value).toContain('网络');
  });
});
