import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { pwaPlugin } from './pwa/pwa-plugin'

// 开发证书只落在已忽略提交的 .cache/，由 `pnpm dev:cert` 生成（见 ADR 0026）。
// 开发服务器因此能提供与 Compose 完全相同的 HTTPS 同源入口：
// 认证的精确 Origin 校验、__Host- 会话 Cookie 与对象存储 CORS 都要求 https://localhost:8443。
const certDir = fileURLToPath(new URL('../../.cache/dev-certs/', import.meta.url))
const certFile = `${certDir}localhost.crt`
const keyFile = `${certDir}localhost.key`

function devHttps() {
  if (!existsSync(certFile) || !existsSync(keyFile)) return undefined
  return { cert: readFileSync(certFile), key: readFileSync(keyFile) }
}

export default defineConfig(({ command }) => {
  const https = devHttps()
  if (command === 'serve' && !https) {
    console.warn('[dev] 未找到 .cache/dev-certs 开发证书：本次以 HTTP 启动，注册/登录等认证请求会被 API 拒绝；执行 pnpm dev:cert 生成证书。')
  }
  return {
    plugins: [vue(), tailwindcss(), pwaPlugin()],
    server: {
      // 与 Compose 入口同源；端口被占用时直接失败，避免换端口后 Origin 校验失败。
      ...(https ? { host: true, port: 8443, strictPort: true, https } : { host: true }),
      proxy: {
        '/api': 'http://127.0.0.1:3000',
        // 管理端开发服务器仍是 http://127.0.0.1:8001，经此代理后与裁判端同源共享 Cookie。
        '/admin': { target: 'http://127.0.0.1:8001', changeOrigin: true, ws: true },
      },
    },
  }
})
