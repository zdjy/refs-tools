export interface SwContainer {
  controller: unknown
  register(url: string): Promise<SwRegistration>
  addEventListener(type: 'controllerchange', listener: () => void): void
}
export interface SwRegistration {
  waiting: SwWorker | null
  installing: SwWorker | null
  addEventListener(type: 'updatefound', listener: () => void): void
}
export interface SwWorker {
  state: string
  postMessage(message: unknown): void
  addEventListener(type: 'statechange', listener: () => void): void
}

export interface SwHandle {
  /** 通知等待中的新版本接管；页面将在 controllerchange 后重载。 */
  applyUpdate(): void
}

/**
 * 注册应用外壳 Service Worker（ADR 0031）；仅在生产构建且浏览器支持时调用。
 * 新版本安装完成后不自动接管，而是通过 onUpdateReady 交给界面询问，避免打断进行中的比赛记录。
 * @returns 不支持或注册失败时返回 null，应用照常在线运行。
 */
export async function registerShell(
  container: SwContainer | undefined,
  onUpdateReady: () => void,
  reload: () => void,
): Promise<SwHandle | null> {
  if (!container) return null
  let registration: SwRegistration
  try { registration = await container.register('/sw.js') } catch { return null }
  let waiting = registration.waiting
  const markReady = (worker: SwWorker) => { waiting = worker; onUpdateReady() }
  // 已有控制器才说明这是“更新”；首次安装没有旧版本需要替换，不打扰用户。
  if (waiting && container.controller) markReady(waiting)
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed' && container.controller) markReady(worker)
    })
  })
  let reloading = false
  container.addEventListener('controllerchange', () => {
    if (reloading) return
    reloading = true
    reload()
  })
  return { applyUpdate: () => waiting?.postMessage({ type: 'SKIP_WAITING' }) }
}
