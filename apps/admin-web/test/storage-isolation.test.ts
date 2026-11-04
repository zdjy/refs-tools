import { beforeEach, describe, expect, it, vi } from 'vitest';

// Storage.ts 在模块底部创建默认实例并引用全局 localStorage；Node 环境没有它，需在导入前提供。
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} });
const { default: Storage } = await import('../src/utils/Storage');

/** 最小 localStorage 替身：与浏览器一致，Object.keys 可枚举已写入的键。 */
function memoryStorage(): globalThis.Storage {
  const data = new Map<string, string>();
  return new Proxy({} as globalThis.Storage, {
    get(_t, prop: string) {
      if (prop === 'getItem') return (k: string) => data.get(k) ?? null;
      if (prop === 'setItem') return (k: string, v: string) => void data.set(k, String(v));
      if (prop === 'removeItem') return (k: string) => void data.delete(k);
      if (prop === 'clear') return () => data.clear();
      if (prop === 'length') return data.size;
      return data.get(prop);
    },
    ownKeys: () => [...data.keys()],
    getOwnPropertyDescriptor: (_t, k: string) =>
      data.has(k) ? { enumerable: true, configurable: true, value: data.get(k) } : undefined,
  });
}

describe('管理端本地缓存与同源裁判端隔离', () => {
  let raw: globalThis.Storage;
  beforeEach(() => { raw = memoryStorage(); });

  it('clear() 只清理本前缀的键，保留裁判端工作台数据', () => {
    raw.setItem('refs-tools:workbench:sessions:v1', '{"keep":true}');
    raw.setItem('refs-tools:workbench:active:v1', 'a');
    const admin = new Storage('ADMIN__', raw);
    admin.set('TABS-ROUTES', 'x');
    admin.set('LOCALE_KEY', 'zh-CN');
    expect(Object.keys(raw)).toHaveLength(4);

    admin.clear();

    expect(Object.keys(raw).sort()).toEqual(['refs-tools:workbench:active:v1', 'refs-tools:workbench:sessions:v1']);
    expect(raw.getItem('refs-tools:workbench:sessions:v1')).toBe('{"keep":true}');
  });

  it('键名加前缀并大写，不会与裁判端键冲突', () => {
    const admin = new Storage('ADMIN__', raw);
    admin.set('tabs-routes', 'x');
    expect(Object.keys(raw)).toEqual(['ADMIN__TABS-ROUTES']);
    expect(admin.get('tabs-routes')).toBe('x');
  });

  it('remove() 同样只作用于带前缀的键', () => {
    raw.setItem('TABS-ROUTES', 'legacy');
    const admin = new Storage('ADMIN__', raw);
    admin.set('TABS-ROUTES', 'x');
    admin.remove('TABS-ROUTES');
    expect(raw.getItem('ADMIN__TABS-ROUTES')).toBeNull();
    expect(raw.getItem('TABS-ROUTES')).toBe('legacy');
  });
});
