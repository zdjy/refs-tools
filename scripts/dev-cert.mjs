#!/usr/bin/env node
// 生成仅本机开发使用的开发证书，供 Vite 开发服务器在 https://localhost:8443 提供同源入口。
// 采用「本地 CA + localhost 叶子证书」两段结构：浏览器只信任 CA，叶子证书可以随时重签。
// 与 docker/init-certificates.sh 生成的联调证书相互独立：本证书只落在已忽略提交的 .cache/，
// 不进 Docker volume、不进镜像，避免开发证书与 Compose 证书的轮换互相牵连。
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const certDir = join(root, '.cache', 'dev-certs')
const caPath = join(certDir, 'ca.crt')
const caKeyPath = join(certDir, 'ca.key')
const certPath = join(certDir, 'localhost.crt')
const keyPath = join(certDir, 'localhost.key')
const csrPath = join(certDir, 'localhost.csr')
const configPath = join(certDir, 'openssl.cnf')
const force = process.argv.includes('--force')
const newCa = process.argv.includes('--new-ca')

// 显式最小配置：不读取系统 openssl.cnf，避免默认扩展与 -extfile 叠加出重复的
// basicConstraints —— 重复扩展会让 Chrome 直接判为 ERR_CERT_INVALID。
const opensslConfig = `# 由 scripts/dev-cert.mjs 生成，仅本机开发使用。
[req]
distinguished_name = dn
prompt = no

[dn]
CN = localhost

[v3_ca]
basicConstraints = critical,CA:TRUE
keyUsage = critical,keyCertSign,cRLSign
subjectKeyIdentifier = hash

[v3_leaf]
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature,keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = DNS:localhost,IP:127.0.0.1
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer
`

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
  const caReady = [caPath, caKeyPath].every((path) => existsSync(path)) && !newCa
  if (!force && caReady && [certPath, keyPath].every((path) => existsSync(path))) {
    if (!quiet) console.log(`[cert] 复用已有开发证书 ${certPath}（信任锚 ${caPath}）`)
    return { certPath, keyPath, caPath }
  }
  mkdirSync(certDir, { recursive: true })
  for (const path of [certPath, keyPath, csrPath]) rmSync(path, { force: true })
  writeFileSync(configPath, opensslConfig)

  // 1) 本地 CA：只用于签发 localhost 叶子证书，浏览器信任的是这一张。
  // 默认复用已有 CA（--force 只重签叶子证书，不需要重新导入信任）；--new-ca 才会轮换 CA。
  if (!caReady) {
    for (const path of [caPath, caKeyPath]) rmSync(path, { force: true })
    openssl([
      'req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-nodes', '-days', '3650',
      '-keyout', caKeyPath, '-out', caPath,
      '-subj', '/CN=refs-tools local dev CA',
      '-config', configPath, '-extensions', 'v3_ca',
    ])
  }
  // 2) 叶子证书：SAN 覆盖 localhost 与 127.0.0.1，有效期一年。
  openssl(['req', '-new', '-newkey', 'rsa:2048', '-sha256', '-nodes', '-keyout', keyPath, '-out', csrPath, '-subj', '/CN=localhost', '-config', configPath])
  openssl([
    'x509', '-req', '-in', csrPath, '-CA', caPath, '-CAkey', caKeyPath, '-CAcreateserial',
    '-days', '365', '-sha256', '-extfile', configPath, '-extensions', 'v3_leaf', '-out', certPath,
  ])
  rmSync(csrPath, { force: true })

  if (!quiet) {
    console.log(`[cert] 已生成开发证书 ${certPath}（签发者 ${caPath}）`)
    console.log('[cert] 首次使用需让本机浏览器信任 CA 公开证书（私钥不导出、不提交）：')
    console.log(`[cert]   certutil -user -addstore Root "${caPath}"`)
    console.log('[cert] 停用后可执行 certutil -user -delstore Root "refs-tools local dev CA" 移除信任。')
    console.log('[cert] 重新生成后需重启 pnpm dev，并在浏览器完全退出后重新打开（Chrome 会缓存证书错误）。')
  }
  return { certPath, keyPath, caPath }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    ensureDevCertificate()
  } catch (error) {
    console.error(`[cert] ${error.message}`)
    process.exitCode = 1
  }
}
