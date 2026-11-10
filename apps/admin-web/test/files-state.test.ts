import { describe, expect, it, vi } from 'vitest';
import type { AdminMedia } from '@refs-tools/contracts/admin-media';
import { MediaApiError } from '../src/api/system/media';
import { useFiles } from '../src/views/system/file/useFiles';

function fixture() {
  const file: AdminMedia = { id: 'file-id', ownerUserId: 'owner-id', ownerDisplayName: '裁判甲', purpose: 'forum_attachment', status: 'available', fileName: '测试.jpg',
    target: { type: 'self', id: 'owner-id' }, contentType: 'image/jpeg', expectedSizeBytes: 100, verifiedSizeBytes: 100,
    createdAt: new Date().toISOString(), expiresAt: new Date().toISOString(), verifiedAt: null, deletedAt: null, cleanedAt: null };
  const api = { list: vi.fn(async () => ({ items: [file], total: 1, page: 1, pageSize: 20 as const })),
    detail: vi.fn(async () => file), read: vi.fn(async () => ({ url: 'https://private.example', expiresAt: new Date().toISOString() })),
    remove: vi.fn(async () => { file.status = 'deleted'; return { status: 'deleted' as const }; }) };
  return { file, api, state: useFiles(api) };
}
describe('管理文件页面状态', () => {
  it('读取失败保留列表并反馈错误，不伪装成空数据', async () => {
    const f = fixture(); await f.state.load(); f.api.list.mockRejectedValueOnce(new MediaApiError('NETWORK_ERROR', 0)); await f.state.load();
    expect(f.state.items.value).toHaveLength(1); expect(f.state.error.value).toContain('网络');
  });
  it('归属筛选只提交昵称/实名关键词，不再提交用户 ID', async () => {
    const f = fixture(); f.state.ownerKeyword.value = ' 张三 ';
    await f.state.load();
    expect(f.api.list).toHaveBeenLastCalledWith(expect.objectContaining({ ownerKeyword: '张三' }));
    expect(f.api.list).toHaveBeenLastCalledWith(expect.not.objectContaining({ ownerUserId: expect.anything() }));
    expect(f.state.items.value[0]?.ownerDisplayName).toBe('裁判甲');
  });
  it('旧列表和详情响应不会覆盖新选择或已关闭弹窗', async () => {
    const f = fixture(); let resolve!: (value: Awaited<ReturnType<typeof f.api.list>>) => void;
    f.api.list.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const first = f.state.load(); await f.state.load(2); resolve({ items: [], total: 0, page: 1, pageSize: 20 }); await first;
    expect(f.state.items.value).toHaveLength(1); expect(f.state.page.value).toBe(2);
    let detail!: (value: AdminMedia) => void;
    f.api.detail.mockImplementationOnce(() => new Promise(r => { detail = r; }));
    const opening = f.state.open('old'); f.state.close(); detail(f.file); await opening;
    expect(f.state.selected.value).toBeNull(); expect(f.state.showing.value).toBe(false);
  });
  it('下载需要理由和在线可用状态，URL 仅交给当次下载动作', async () => {
    const f = fixture(), deliver = vi.fn(); await f.state.open(f.file.id); await f.state.download(deliver);
    expect(f.api.read).not.toHaveBeenCalled(); expect(f.state.formError.value).toContain('理由');
    f.state.reason.value = '核对资料'; f.state.online.value = false; await f.state.download(deliver); expect(deliver).not.toHaveBeenCalled();
    f.state.online.value = true; await f.state.download(deliver); expect(deliver).toHaveBeenCalledWith('https://private.example');
    expect(f.state.notice.value).toContain('不代表下载已完成'); expect(JSON.stringify(f.state)).not.toContain('https://private.example');
  });
  it('删除在独立弹窗中完成：缺理由不提交，失败保留理由并提示访问可能已撤销，重试后刷新', async () => {
    const f = fixture(); await f.state.load();
    f.state.askRemove(f.file); await f.state.submitRemove();
    expect(f.api.remove).not.toHaveBeenCalled(); expect(f.state.deleteError.value).toContain('理由');
    f.state.deleteReason.value = '违规附件'; f.api.remove.mockRejectedValueOnce(new MediaApiError('NETWORK_ERROR', 0));
    await f.state.submitRemove();
    expect(f.state.deleteReason.value).toBe('违规附件'); expect(f.state.deleteError.value).toContain('可能已撤销');
    expect(f.state.notice.value).toBe(''); expect(f.state.deleteTarget.value?.id).toBe(f.file.id);
    await f.state.submitRemove();
    expect(f.api.list).toHaveBeenCalled(); expect(f.state.deleteTarget.value).toBeNull();
    expect(f.state.notice.value).toContain('对象删除请求已完成');
    expect(f.state.items.value[0]?.status).toBe('deleted');
  });
  it('离线、重复操作及忙碌关闭不能触发额外请求', async () => {
    const f = fixture(); f.state.online.value = false; f.state.askRemove(f.file);
    expect(f.state.deleteTarget.value).toBeNull();
    f.state.online.value = true; f.state.askRemove(f.file); f.state.deleteReason.value = '核对';
    let resolve!: (value: { status: 'deleted' }) => void;
    f.api.remove.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const pending = f.state.submitRemove(); await f.state.submitRemove(); f.state.cancelRemove();
    expect(f.api.remove).toHaveBeenCalledTimes(1); expect(f.state.deleteTarget.value?.id).toBe(f.file.id);
    resolve({ status: 'deleted' }); await pending;
  });
});
