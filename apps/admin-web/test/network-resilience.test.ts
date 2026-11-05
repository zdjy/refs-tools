import { describe, expect, it, vi } from 'vitest';
import { AdminApiError, createPlatformClient } from '../src/api/http/platform-client';
import { createNetworkMonitor } from '../src/infrastructure/network/network-monitor';
import { createLoadingPhaseTracker, type LoadingPhase } from '../src/infrastructure/network/loading-phase';
import { networkPolicy } from '../src/infrastructure/network/network-policy';
import { networkStatus, shouldAnnounceRecovery } from '../src/infrastructure/network/network-status';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function setup(responses: Array<() => Response | Promise<Response>>) {
  const monitor = createNetworkMonitor();
  let index = 0;
  const fetchMock = vi.fn(async (_url: unknown, _init?: RequestInit) => responses[Math.min(index++, responses.length - 1)]!());
  const client = createPlatformClient({
    fetch: fetchMock as unknown as typeof fetch, monitor, retry: { sleep: async () => {}, random: () => 0 },
  });
  return { client, fetchMock, monitor };
}

describe('管理端弱网：请求守卫', () => {
  it('GET 在 503 与断网后自动重试并成功，监视器记录成功', async () => {
    const { client, fetchMock, monitor } = setup([
      () => json({ error: { code: 'X' } }, 503),
      () => Promise.reject(new TypeError('offline')),
      () => json({ data: { ok: 1 } }),
    ]);
    expect(await client.get('/admin/users')).toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(monitor.snapshot()).toMatchObject({ pending: 0, lastOutcome: 'success' });
  });

  it('GET 重试用尽后抛出网络错误', async () => {
    const { client, fetchMock } = setup([() => Promise.reject(new TypeError('offline'))]);
    await expect(client.get('/x')).rejects.toMatchObject({ status: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(networkPolicy.readRetries + 1);
  });

  it.each([[400], [401], [404], [409], [429], [500]])('GET 遇到 HTTP %i 不重试', async (status) => {
    const { client, fetchMock } = setup([() => json({ error: { code: 'E', message: 'm' } }, status)]);
    await expect(client.get('/x')).rejects.toMatchObject({ status });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(['post', 'patch', 'delete'] as const)('%s 失败后只发送一次，避免重复写入', async (name) => {
    const { client, fetchMock } = setup([() => Promise.reject(new TypeError('offline'))]);
    await expect(client[name]('/x', {})).rejects.toBeInstanceOf(AdminApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('离线时所有方法都不发出请求，并给出 OFFLINE 错误', async () => {
    const { client, fetchMock, monitor } = setup([() => json({ data: 1 })]);
    monitor.setOnline(false);
    await expect(client.get('/x')).rejects.toMatchObject({ code: 'OFFLINE', status: 0 });
    await expect(client.post('/x', {})).rejects.toMatchObject({ code: 'OFFLINE' });
    await expect(client.delete('/x', {})).rejects.toMatchObject({ code: 'OFFLINE' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('离线拒绝不触发退避等待', async () => {
    const monitor = createNetworkMonitor({ online: false });
    const sleep = vi.fn(async () => {});
    const client = createPlatformClient({ monitor, retry: { sleep } });
    await expect(client.get('/x')).rejects.toMatchObject({ code: 'OFFLINE' });
    expect(sleep).not.toHaveBeenCalled();
  });
});

describe('管理端弱网：状态与加载阶段', () => {
  it('按最早在途请求耗时分级，离线优先', () => {
    const base = { online: true, pending: 1, oldestStartedAt: 0, retrying: false, lastOutcome: null } as const;
    expect(networkStatus({ ...base, online: false }, 10)).toBe('offline');
    expect(networkStatus(base, networkPolicy.slowAfterMs)).toBe('slow');
    expect(networkStatus(base, networkPolicy.stalledAfterMs)).toBe('stalled');
    expect(shouldAnnounceRecovery('stalled', 'online', 'failure')).toBe(false);
    expect(shouldAnnounceRecovery('offline', 'online', null)).toBe(true);
  });

  it('快速请求不显示加载态，持续加载依次升级', () => {
    let time = 0, seq = 0;
    const queue = new Map<number, { at: number; run: () => void }>();
    const timers = {
      set: (run: () => void, ms: number) => { queue.set(++seq, { at: time + ms, run }); return seq; },
      clear: (handle: unknown) => { queue.delete(handle as number); },
    };
    const advance = (ms: number) => {
      const target = time + ms;
      for (;;) {
        const due = [...queue.entries()].filter(([, v]) => v.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        queue.delete(due[0]); time = due[1].at; due[1].run();
      }
      time = target;
    };
    const phases: LoadingPhase[] = [];
    const tracker = createLoadingPhaseTracker((p) => phases.push(p), { now: () => time, timers });
    tracker.start(); advance(100); tracker.finish();
    expect(phases).toEqual(['pending', 'idle']);
    phases.length = 0;
    tracker.start(); advance(networkPolicy.stalledAfterMs + 1);
    expect(phases).toEqual(['pending', 'loading', 'slow', 'stalled']);
  });
});
