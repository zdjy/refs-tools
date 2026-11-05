import { describe, expect, it, vi } from 'vitest';
import { AvatarApiError } from '../src/api/system/avatar';
import { createAvatarState } from '../src/store/modules/avatar';

const mediaA = '11111111-1111-4111-8111-111111111111';
const mediaB = '22222222-2222-4222-8222-222222222222';
const expiresAt = '2030-01-01T00:00:00.000Z';

function harness() {
  const readUrl = vi.fn(async (id: string) => ({ url: `https://oss.example/${id}`, expiresAt }));
  return { readUrl, state: createAvatarState({ readUrl }) };
}

describe('管理端顶栏头像状态', () => {
  it('无头像时不请求签名，URL 为空', async () => {
    const h = harness();
    await h.state.ensure(null);
    expect(h.readUrl).not.toHaveBeenCalled();
    expect(h.state.url.value).toBe('');
  });

  it('同一媒体 ID 只签名一次，切换后取新 URL', async () => {
    const h = harness();
    await h.state.ensure(mediaA);
    await h.state.ensure(mediaA);
    expect(h.readUrl).toHaveBeenCalledTimes(1);
    await h.state.ensure(mediaB);
    expect(h.state.url.value).toBe(`https://oss.example/${mediaB}`);
  });

  it('签名失败降级为无头像，不抛错', async () => {
    const h = harness();
    h.readUrl.mockRejectedValueOnce(new AvatarApiError('NOT_FOUND', 404));
    await expect(h.state.ensure(mediaA)).resolves.toBeUndefined();
    expect(h.state.url.value).toBe('');
  });

  it('迟到的旧响应不覆盖新的头像', async () => {
    const h = harness();
    let release: (value: { url: string; expiresAt: string }) => void = () => {};
    h.readUrl.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    const slow = h.state.ensure(mediaA);
    await h.state.ensure(mediaB);
    release({ url: 'https://oss.example/stale', expiresAt });
    await slow;
    expect(h.state.url.value).toBe(`https://oss.example/${mediaB}`);
  });

  it('reset 清空缓存与 URL，之后重新签名', async () => {
    const h = harness();
    await h.state.ensure(mediaA);
    h.state.reset();
    expect(h.state.url.value).toBe('');
    await h.state.ensure(mediaA);
    expect(h.readUrl).toHaveBeenCalledTimes(2);
  });
});
