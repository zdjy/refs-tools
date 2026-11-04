import { describe, expect, it, vi } from 'vitest';
import type { OrganizationDetail } from '@refs-tools/contracts/organizations';
import { OrganizationsApiError } from '../src/api/system/organizations';
import { useOrganizations } from '../src/views/system/organization/useOrganizations';

function fixture() {
  const organization: OrganizationDetail = { id: 'org-id', name: '协会', region: '上海', purpose: '培训', ownerUserId: 'owner-id',
    status: 'pending_review', version: 1, createdAt: new Date().toISOString(), ownerLegalName: '负责人', contact: 'private@example.com',
    reviewedBy: null, reviewedAt: null, governanceReason: null };
  const api = { list: vi.fn(async () => ({ items: [organization], total: 1, page: 1, pageSize: 20 })),
    detail: vi.fn(async () => organization), create: vi.fn(async () => organization), decide: vi.fn(async () => ({ ...organization, status: 'active' as const, version: 2 })) };
  return { organization, api, state: useOrganizations(api) };
}

describe('组织管理页面状态', () => {
  it('读取失败保留旧数据并提示陈旧状态', async () => {
    const f = fixture(); await f.state.load();
    f.api.list.mockRejectedValue(new OrganizationsApiError('NETWORK_ERROR', 0)); await f.state.load();
    expect(f.state.items.value).toHaveLength(1); expect(f.state.error.value).toContain('网络');
  });
  it('旧列表和详情响应不能覆盖当前页面', async () => {
    const f = fixture(); let resolveList!: (value: Awaited<ReturnType<typeof f.api.list>>) => void;
    f.api.list.mockImplementationOnce(() => new Promise(r => { resolveList = r; }));
    const first = f.state.load(); await f.state.load(2); resolveList({ items: [], total: 0, page: 1, pageSize: 20 }); await first;
    expect(f.state.items.value).toHaveLength(1); expect(f.state.page.value).toBe(2);
    let resolveDetail!: (value: OrganizationDetail) => void;
    f.api.detail.mockImplementationOnce(() => new Promise(r => { resolveDetail = r; }));
    const opening = f.state.open('old'); f.state.create(); resolveDetail(f.organization); await opening;
    expect(f.state.mode.value).toBe('create'); expect(f.state.selected.value).toBeNull();
  });
  it('代录失败保留输入，成功后重载列表', async () => {
    const f = fixture(); f.state.create(); f.state.form.contact = 'contact';
    f.api.create.mockRejectedValueOnce(new OrganizationsApiError('INVALID_OWNER', 422)); await f.state.save();
    expect(f.state.form.contact).toBe('contact'); expect(f.state.formError.value).toContain('负责人');
    await f.state.save(); expect(f.state.mode.value).toBeNull(); expect(f.state.notice.value).toContain('等待审核');
  });
  it('治理需理由和二次确认，版本冲突保留输入', async () => {
    const f = fixture(); await f.state.open(f.organization.id); f.state.action.value = 'approve';
    f.state.requestDecision(); expect(f.state.confirming.value).toBe(false);
    f.state.reason.value = '核对通过'; await f.state.decide(); expect(f.api.decide).not.toHaveBeenCalled();
    f.state.requestDecision(); f.api.decide.mockRejectedValueOnce(new OrganizationsApiError('VERSION_CONFLICT', 409)); await f.state.decide();
    expect(f.state.reason.value).toBe('核对通过'); expect(f.state.formError.value).toContain('重新读取');
    expect(f.state.confirming.value).toBe(false); expect(f.state.notice.value).toBe('');
  });
  it('详情失败、离线与重复提交均不能触发写入', async () => {
    const f = fixture(); f.api.detail.mockRejectedValueOnce(new OrganizationsApiError('NETWORK_ERROR', 0)); await f.state.open(f.organization.id);
    f.state.action.value = 'approve'; f.state.reason.value = '通过'; f.state.requestDecision(); await f.state.decide();
    expect(f.api.decide).not.toHaveBeenCalled();
    await f.state.open(f.organization.id); f.state.action.value = 'approve'; f.state.reason.value = '通过'; f.state.online.value = false;
    f.state.requestDecision(); expect(f.state.confirming.value).toBe(false);
    f.state.online.value = true; f.state.requestDecision();
    let resolve!: (value: Awaited<ReturnType<typeof f.api.decide>>) => void;
    f.api.decide.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const first = f.state.decide(); await f.state.decide(); f.state.close();
    expect(f.api.decide).toHaveBeenCalledTimes(1); expect(f.state.mode.value).toBe('detail');
    resolve({ ...f.organization, status: 'active', version: 2 }); await first;
    expect(f.state.selected.value?.version).toBe(2); expect(f.state.notice.value).toContain('已更新');
  });
  it('关闭弹窗清除详情和敏感输入', async () => {
    const f = fixture(); await f.state.open(f.organization.id); f.state.reason.value = '治理依据'; f.state.close();
    expect(f.state.selected.value).toBeNull(); expect(f.state.reason.value).toBe('');
  });
});
