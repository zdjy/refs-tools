#!/usr/bin/env node
// 一键本机热更新开发：API 用 tsx watch、两个前端用 Vite 开发服务器，基础设施仍由 Docker Compose 提供。
// 浏览器入口固定为 https://localhost:8443（由 Vite 提供），与 Compose 入口同源，
// 因此认证 Origin 校验、__Host- Cookie 和对象存储 CORS 都不需要放宽。
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { connect } from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureDevCertificate } from './dev-cert.mjs'
import { spawnApi } from './dev-api.mjs'

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

function portInUse(port) {
  return new Promise((resolve) => {
    const socket = connect({ host: '127.0.0.1', port })
    socket.setTimeout(600)
    socket.once('connect', () => { socket.destroy(); resolve(true) })
    socket.once('timeout', () => { socket.destroy(); resolve(false) })
    socket.once('error', () => resolve(false))
  })
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

  const busy = []
  for (const port of [3000, 8443, 8001]) if (await portInUse(port)) busy.push(port)
  if (busy.length > 0) {
    console.error(`[dev] 端口被占用：${busy.join(', ')}`)
    console.error('[dev] 若占用者是 Compose 的 api/web 容器，请先执行：docker compose stop api web')
    process.exitCode = 1
    return
  }

  const { caPath } = ensureDevCertificate()

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
  console.log(`[dev] 首次使用需信任开发 CA 证书：certutil -user -addstore Root "${caPath}"`)
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
