import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { buildPrecache, renderServiceWorker, type PrecacheAsset } from './pwa-precache'

const template = readFileSync(fileURLToPath(new URL('./sw.template.js', import.meta.url)), 'utf8')

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? listFiles(path) : [path]
  })
}

/**
 * 构建期生成应用外壳 Service Worker（ADR 0031）。
 * 不引入 workbox：外壳策略只有「预缓存 + 导航网络优先 + 资源缓存优先」三条，自写模板更小、更易审计。
 */
export function pwaPlugin(): Plugin {
  let publicDir = ''
  return {
    name: 'referee-pwa-shell',
    apply: 'build',
    configResolved(config) { publicDir = config.publicDir },
    generateBundle(_options, bundle) {
      const assets: PrecacheAsset[] = Object.values(bundle).map((item) => ({
        fileName: item.fileName,
        size: item.type === 'chunk' ? Buffer.byteLength(item.code) : Buffer.byteLength(item.source),
      }))
      // public/ 下的图标与清单由 Vite 在 bundle 之外直接复制，需要单独统计。
      if (publicDir) {
        for (const path of listFiles(publicDir)) {
          assets.push({ fileName: relative(publicDir, path).split('\\').join('/'), size: statSync(path).size })
        }
      }
      const precache = buildPrecache(assets)
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: renderServiceWorker(template, precache) })
    },
  }
}
