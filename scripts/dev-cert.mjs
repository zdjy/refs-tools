#!/usr/bin/env node
// 生成仅本机开发使用的自签名证书，供 Vite 开发服务器在 https://localhost:8443 提供同源入口。
// 与 docker/init-certificates.sh 生成的联调证书相互独立：本证书只落在已忽略提交的 .cache/，
// 不进 Docker volume、不进镜像，避免开发证书与 Compose 证书的轮换互相牵连。
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const certDir = join(root, '.cache', 'dev-certs')
const certPath = join(certDir, 'localhost.crt')
const keyPath = join(certDir, 'localhost.key')
const force = process.argv.includes('--force')

function openssl(args) {
  try {
    execFileSync('openssl', args, { stdio: ['ignore', 'ignore', 'pipe'] })
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error('未找到 openssl 命令。Windows 可安装 Git for Windows 并把它的 usr/bin 或 mingw64/bin 加入 PATH。')
    }
    throw new Error(`openssl 执行失败：${error?.stderr?.toString().trim() ?? error?.message ?? error}`)
  }
}

export function ensureDevCertificate({ quiet = false } = {}) {
  if (!force && existsSync(certPath) && existsSync(keyPath)) {
    if (!quiet) console.log(`[cert] 复用已有开发证书 ${certPath}`)
    return { certPath, keyPath }
  }
  mkdirSync(certDir, { recursive: true })
  rmSync(certPath, { force: true })
  rmSync(keyPath, { force: true })
  openssl([
    'req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-nodes', '-days', '365',
    '-keyout', keyPath, '-out', certPath,
    '-subj', '/CN=refs-tools local dev (vite)',
    '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1',
    '-addext', 'basicConstraints=critical,CA:TRUE',
    '-addext', 'keyUsage=critical,digitalSignature,keyEncipherment,keyCertSign',
    '-addext', 'extendedKeyUsage=serverAuth',
  ])
  if (!quiet) {
    console.log(`[cert] 已生成开发证书 ${certPath}`)
    console.log('[cert] 首次使用需让本机浏览器信任该公开证书（私钥不导出、不提交）：')
    console.log(`[cert]   certutil -user -addstore Root "${certPath}"`)
    console.log('[cert] 停用后可执行 certutil -user -delstore Root "refs-tools local dev (vite)" 移除信任。')
  }
  return { certPath, keyPath }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    ensureDevCertificate()
  } catch (error) {
    console.error(`[cert] ${error.message}`)
    process.exitCode = 1
  }
}
