import { createHash } from 'node:crypto'

/** 预缓存总量上限：2C2G 主机与弱网场景下，应用外壳超出此值应显式评估而不是静默变大。 */
export const PRECACHE_BUDGET_BYTES = 2_500_000

/** 只预缓存应用外壳所需的文件；管理端、API 与媒体不在其中。 */
const SHELL_PATTERN = /\.(?:js|css|html|png|ico|webmanifest)$/

export interface PrecacheAsset { fileName: string; size: number }

/**
 * 由构建产物生成预缓存清单与版本号。
 * 版本号取排序后文件名的哈希：带内容哈希的文件名变化即版本变化，旧缓存据此整体淘汰。
 * @throws 总量超过预算时抛错，让构建失败而不是悄悄把离线外壳撑大。
 */
export function buildPrecache(assets: readonly PrecacheAsset[]) {
  const shell = assets.filter((asset) => SHELL_PATTERN.test(asset.fileName) && asset.fileName !== 'sw.js')
  const total = shell.reduce((sum, asset) => sum + asset.size, 0)
  if (total > PRECACHE_BUDGET_BYTES) {
    throw new Error(`预缓存 ${total} 字节，超过上限 ${PRECACHE_BUDGET_BYTES}；请拆分或排除资源后再构建。`)
  }
  const urls = ['/', ...shell.map((asset) => `/${asset.fileName}`).filter((url) => url !== '/index.html')].sort()
  const version = createHash('sha256').update(urls.join('\n')).digest('hex').slice(0, 12)
  return { urls, version, total }
}

/** 把清单与版本号写入 Service Worker 模板的占位符。 */
export function renderServiceWorker(template: string, precache: { urls: string[]; version: string }) {
  return template
    .replace('__PRECACHE_VERSION__', precache.version)
    .replace('__PRECACHE_URLS__', JSON.stringify(precache.urls))
}
