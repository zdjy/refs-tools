import { describe, expect, it, vi } from 'vitest'
import { PRECACHE_BUDGET_BYTES, buildPrecache, renderServiceWorker } from '../pwa/pwa-precache'
import { registerShell, type SwContainer, type SwRegistration, type SwWorker } from '../src/infrastructure/pwa/register-sw'

const asset = (fileName: string, size = 100) => ({ fileName, size })

describe('应用外壳预缓存清单', () => {
  it('只收录静态外壳文件并包含根路径，排除 sw.js 与无关类型', () => {
    const { urls } = buildPrecache([asset('index.html'), asset('assets/a-1.js'), asset('icons/icon-192.png'), asset('sw.js'), asset('notes.txt')])
    expect(urls).toEqual(['/', '/assets/a-1.js', '/icons/icon-192.png'])
  })

  it('文件名集合变化则版本变化，顺序不影响版本', () => {
    const a = buildPrecache([asset('assets/a-1.js'), asset('assets/b-1.css')]).version
    expect(buildPrecache([asset('assets/b-1.css'), asset('assets/a-1.js')]).version).toBe(a)
    expect(buildPrecache([asset('assets/a-2.js'), asset('assets/b-1.css')]).version).not.toBe(a)
  })

  it('超过预算时构建失败而不是静默变大', () => {
    expect(() => buildPrecache([asset('assets/huge.js', PRECACHE_BUDGET_BYTES + 1)])).toThrow('超过上限')
  })

  it('把版本与清单写入模板占位符', () => {
    const out = renderServiceWorker("const V='__PRECACHE_VERSION__';const P=__PRECACHE_URLS__", { urls: ['/', '/a.js'], version: 'abc' })
    expect(out).toBe("const V='abc';const P=[\"/\",\"/a.js\"]")
  })
})

function worker(state = 'installed'): SwWorker & { listeners: Array<() => void> } {
  const listeners: Array<() => void> = []
  return { state, postMessage: vi.fn(), addEventListener: (_t, l) => { listeners.push(l) }, listeners }
}
function setup(options: { controller?: unknown; waiting?: SwWorker | null; installing?: SwWorker | null } = {}) {
  const updateFound: Array<() => void> = []
  const controllerChange: Array<() => void> = []
  const registration: SwRegistration = {
    waiting: options.waiting ?? null, installing: options.installing ?? null,
    addEventListener: (_t, l) => { updateFound.push(l) },
  }
  const container: SwContainer = {
    controller: options.controller ?? null,
    register: vi.fn(async () => registration),
    addEventListener: (_t, l) => { controllerChange.push(l) },
  }
  return { container, registration, updateFound, controllerChange }
}

describe('外壳 Service Worker 注册', () => {
  it('浏览器不支持或注册失败时静默降级', async () => {
    expect(await registerShell(undefined, vi.fn(), vi.fn())).toBeNull()
    const { container } = setup()
    container.register = vi.fn(async () => { throw new Error('denied') })
    expect(await registerShell(container, vi.fn(), vi.fn())).toBeNull()
  })

  it('首次安装（无控制器）不提示更新', async () => {
    const installing = worker()
    const { container, registration, updateFound } = setup()
    const ready = vi.fn()
    await registerShell(container, ready, vi.fn())
    registration.installing = installing
    updateFound.forEach((l) => l())
    installing.listeners.forEach((l) => l())
    expect(ready).not.toHaveBeenCalled()
  })

  it('已有控制器时新版本安装完成后提示，确认后才发送 SKIP_WAITING 并在接管后重载一次', async () => {
    const installing = worker()
    const { container, registration, updateFound, controllerChange } = setup({ controller: {} })
    const ready = vi.fn()
    const reload = vi.fn()
    const handle = await registerShell(container, ready, reload)
    registration.installing = installing
    updateFound.forEach((l) => l())
    installing.listeners.forEach((l) => l())
    expect(ready).toHaveBeenCalledOnce()
    expect(installing.postMessage).not.toHaveBeenCalled()
    handle!.applyUpdate()
    expect(installing.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    controllerChange.forEach((l) => l())
    controllerChange.forEach((l) => l())
    expect(reload).toHaveBeenCalledOnce()
  })

  it('页面加载时已有等待中的新版本，立即提示', async () => {
    const { container } = setup({ controller: {}, waiting: worker() })
    const ready = vi.fn()
    await registerShell(container, ready, vi.fn())
    expect(ready).toHaveBeenCalledOnce()
  })
})
