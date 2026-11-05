import { describe, expect, it, vi } from 'vitest';
import type { Membership } from '@refs-tools/contracts/organization-members';
import type { OrganizationDetail } from '@refs-tools/contracts/organizations';
import { OrganizationsApiError } from '../src/api/system/organizations';
import { useOwnershipTransfer } from '../src/views/system/organization/useOwnershipTransfer';

function fixture() {
  const organization: OrganizationDetail = { id: 'org-id', name: '协会', region: '上海', purpose: '培训', ownerUserId: 'owner-id',
    status: 'active', version: 3, createdAt: new Date().toISOString(), ownerLegalName: '负责人', contact: '联系方式',
    reviewedBy: null, reviewedAt: null, governanceReason: null };
  const member = (userId: string, status: Membership['status']): Membership => ({ id: `m-${userId}`, organizationId: 'org-id', userId,
    displayName: `成员${userId}`, status, version: 1, createdAt: new Date().toISOString() });
  const members = { members: vi.fn(async () => ({ items: [member('owner-id', 'active'), member('next-id', 'active'), member('wait-id', 'pending')],
    total: 3, page: 1, pageSize: 20 })) };
  const api = { transferOwner: vi.fn(async () => organization) };
  const done = vi.fn();
  return { organization, api, members, done, state: useOwnershipTransfer(api as never, members as never, done) };
}

describe('平台移交所有权弹窗状态', () => {
  it('候选人只保留正式成员且排除当前负责人', async () => {
    const f = fixture(); await f.state.open(f.organization);
    expect(f.state.candidates.value.map(item => item.userId)).toEqual(['next-id']);
  });
  it('未选新负责人或缺理由不进入确认，也不提交', async () => {
    const f = fixture(); await f.state.open(f.organization);
    f.state.requestConfirm(); expect(f.state.error.value).toContain('新负责人'); expect(f.state.confirming.value).toBe(false);
    f.state.selectedId.value = 'next-id'; f.state.reason.value = '  '; f.state.requestConfirm();
    expect(f.state.error.value).toContain('理由'); await f.state.commit(); expect(f.api.transferOwner).not.toHaveBeenCalled();
  });
  it('确认后以最新组织版本提交；成功清空弹窗、给出结果并通知刷新', async () => {
    const f = fixture(); await f.state.open(f.organization);
    f.state.selectedId.value = 'next-id'; f.state.reason.value = ' 原负责人失联 '; f.state.requestConfirm();
    await f.state.commit();
    expect(f.api.transferOwner).toHaveBeenCalledWith('org-id', { toUserId: 'next-id', expectedVersion: 3, reason: '原负责人失联' });
    expect(f.state.notice.value).toContain('已移交'); expect(f.state.organization.value).toBeNull(); expect(f.done).toHaveBeenCalledTimes(1);
  });
  it('失败保留输入且不报成功：版本冲突与资料不完整给出对应说明', async () => {
    const f = fixture(); await f.state.open(f.organization);
    f.state.selectedId.value = 'next-id'; f.state.reason.value = '处理'; f.state.requestConfirm();
    f.api.transferOwner.mockRejectedValueOnce(new OrganizationsApiError('PROFILE_INCOMPLETE', 422)); await f.state.commit();
    expect(f.state.error.value).toContain('真实姓名'); expect(f.state.notice.value).toBe('');
    expect(f.state.selectedId.value).toBe('next-id'); expect(f.state.reason.value).toBe('处理'); expect(f.done).not.toHaveBeenCalled();
    f.state.requestConfirm(); f.api.transferOwner.mockRejectedValueOnce(new OrganizationsApiError('VERSION_CONFLICT', 409)); await f.state.commit();
    expect(f.state.error.value).toContain('重新读取'); expect(f.state.busy.value).toBe(false);
  });
  it('未走确认步骤直接提交被拒绝；读取成员失败给出错误而不是空候选', async () => {
    const f = fixture(); await f.state.open(f.organization); f.state.selectedId.value = 'next-id'; f.state.reason.value = '处理';
    await f.state.commit(); expect(f.api.transferOwner).not.toHaveBeenCalled();
    f.members.members.mockRejectedValueOnce(new OrganizationsApiError('NETWORK_ERROR', 0)); await f.state.load(1);
    expect(f.state.error.value).toContain('网络');
  });
});
