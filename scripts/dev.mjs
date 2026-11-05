#!/usr/bin/env node
// 一键本机热更新开发：API 用 tsx watch、两个前端用 Vite 开发服务器，基础设施仍由 Docker Compose 提供。
// 浏览器入口固定为 https://localhost:8443（由 Vite 提供），与 Compose 入口同源，
// 因此认证 Origin 校验、__Host- Cookie 和对象存储 CORS 都不需要放宽。
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureDevCertificate } from './dev-cert.mjs'
import { ensureComposeCertificate, spawnApi } from './dev-api.mjs'
import { DEV_PORTS, findPortListeners, portInUse, stopDevProcesses } from './dev-process.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const refereeDir = join(root, 'apps', 'referee-web')
const adminDir = join(root, 'apps', 'admin-web')

/** Vite 由所属应用自己的依赖提供；两个前端不共享 node_modules。 */
function viteCli(packageDir) {
  const pkgPath = createRequire(join(packageDir, 'package.json')).resolve('vite/package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin.vite
  return join(dirname(pkgPath), bin)
}

/** 端口被占用时指出真正的占用者：Compose 的 api/web 容器只是其中一种可能，更多是上次未退出的 tsx/vite 子进程。 */
function reportBusyPorts(busy) {
  const listeners = findPortListeners(busy)
  console.error(`[dev] 端口被占用：${busy.join(', ')}`)
  for (const listener of listeners) {
    const owner = listener.ownedByRepo ? '本仓库遗留的开发进程' : '其他程序'
    console.error(`[dev]   ${listener.port}  PID ${listener.pid}  ${listener.name || '未知进程'}（${owner}）`)
    if (listener.command) console.error(`[dev]     ${listener.command}`)
  }
  if (listeners.some((listener) => listener.ownedByRepo)) {
    console.error('[dev] 上次 pnpm dev 未正常退出时会留下 tsx watch 与 Vite 子进程，执行 pnpm dev:stop 清理后重试。')
  }
  if (listeners.some((listener) => !listener.ownedByRepo)) {
    console.error(`[dev] 其他程序占用时需自行结束，例如：${process.platform === 'win32' ? 'taskkill /PID <pid> /T /F' : 'kill -9 <pid>'}`)
    console.error('[dev] 若占用者是 Compose 的 api/web 容器，先执行：docker compose stop api web')
  }
}

/** 多进程共用终端时按行加前缀，便于区分 API 与两个前端。 */
function prefix(name, chunk) {
  return chunk.toString().split('\n').map((line, index, lines) => {
    if (index === lines.length - 1 && line === '') return ''
    return `[${name}] ${line}`
  }).join('\n')
}

function run(name, command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.on('data', (chunk) => process.stdout.write(prefix(name, chunk)))
  child.stderr.on('data', (chunk) => process.stderr.write(prefix(name, chunk)))
  child.on('exit', (code) => {
    if (code) console.error(`[${name}] 进程退出，code=${code}`)
  })
  return child
}

function terminate(child) {
  if (!child || child.exitCode !== null) return
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else child.kill('SIGTERM')
}

const infraServices = ['db', 'mailpit', 'minio', 'minio-init', 'storage', 'certificates']

/** 重启电脑后容器不会自动启动；这里先确保基础设施就绪，让 `pnpm dev` 成为唯一入口。 */
function ensureInfra() {
  const docker = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], { stdio: 'ignore' })
  if (docker.status !== 0) {
    throw new Error('Docker 未运行：请先启动 Docker Desktop，再执行 pnpm dev')
  }
  console.log('[dev] 确认基础设施容器（db/mailpit/minio/storage）就绪…')
  const up = spawnSync('docker', ['compose', 'up', '-d', '--wait', '--wait-timeout', '120', ...infraServices], { cwd: root, stdio: 'inherit' })
  if (up.status !== 0) throw new Error('基础设施容器启动失败：请执行 pnpm dev:infra 查看详细输出')
}

async function main() {
  const skipInfra = process.argv.includes('--no-infra')
  if (!skipInfra) ensureInfra()

  if (process.argv.includes('--kill-stale')) {
    for (const entry of stopDevProcesses().stopped) {
      console.log(`[dev] 已结束本仓库遗留开发进程：PID ${entry.pid} ${entry.name}`)
    }
  }

  const busy = []
  for (const port of DEV_PORTS) if (await portInUse(port)) busy.push(port)
  if (busy.length > 0) {
    reportBusyPorts(busy)
    process.exitCode = 1
    return
  }

  const { caPath } = ensureDevCertificate()
  // 对象存储入口 9443 用 Compose 证书，与开发 CA 互不相关；浏览器只信任开发 CA 时直传会报证书错误。
  // --no-infra 或容器尚未创建时无法导出公开证书，这里只降级提示，不阻断启动。
  let storageCertPath = ''
  try { storageCertPath = ensureComposeCertificate() } catch { storageCertPath = '' }

  console.log('[dev] 启动 API（tsx watch）、裁判端与管理端（Vite）…')
  const children = [
    spawnApi(undefined, { quiet: true }),
    run('referee', process.execPath, [viteCli(refereeDir)], refereeDir),
    run('admin', process.execPath, [viteCli(adminDir)], adminDir),
  ]

  const webPort = process.env['WEB_PORT'] || '8443'
  console.log('')
  console.log(`[dev] 裁判端      https://localhost:${webPort}/`)
  console.log(`[dev] 管理端      https://localhost:${webPort}/admin/`)
  console.log('[dev] 收件箱      http://localhost:8025')
  console.log('[dev] 首次使用需信任两张公开证书（两张互不相关，缺任何一张相关请求都会失败）：')
  console.log(`[dev]   入口 8443（开发 CA）        certutil -user -addstore Root "${caPath}"`)
  console.log(storageCertPath
    ? `[dev]   对象存储 9443（Compose 证书） certutil -user -addstore Root "${storageCertPath}"`
    : '[dev]   对象存储 9443（Compose 证书）：docker compose cp certificates:/certs/local.crt .cache/local.crt 后导入')
  console.log('[dev] 只信任开发 CA 时，头像等浏览器直传会报 net::ERR_CERT_AUTHORITY_INVALID，随后核验返回 409。')
  console.log('[dev] Ctrl+C 结束全部进程；基础设施容器保持运行（下次仍用 pnpm dev 一键启动）。')
  console.log('')

  let closing = false
  const shutdown = () => {
    if (closing) return
    closing = true
    console.log('\n[dev] 正在停止本机开发进程…')
    for (const child of children) terminate(child)
    setTimeout(() => process.exit(0), 300)
  }
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, shutdown)
}

await main().catch((error) => {
  console.error(`[dev] 启动失败：${error?.message ?? error}`)
  process.exitCode = 1
})
