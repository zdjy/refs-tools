#!/usr/bin/env node
// 在宿主机直接运行 API（tsx watch，保存即重启），基础设施仍由 Docker Compose 提供。
// 复用根目录 .env 中的本地密钥，只把容器内主机名改写成 127.0.0.1，不复制、不新增密钥文件。
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const apiDir = join(root, 'apps', 'api')
const caPath = join(root, '.cache', 'local.crt')

/** 只解析 KEY=VALUE，忽略注释与空行；不做变量展开，避免把密钥当模板处理。 */
function readDotEnv(path) {
  if (!existsSync(path)) return {}
  const values = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line)
    if (!match) continue
    const value = match[2].trim().replace(/^(['"])(.*)\1$/, '$2')
    values[match[1]] = value
  }
  return values
}

function required(values, key, hint) {
  const value = values[key]
  if (!value) throw new Error(`${key} 未配置：${hint}`)
  return value
}

/** Compose 服务是宿主机的 127.0.0.1 端口；证书公开件从 Compose 容器复制到已忽略提交的 .cache/。
 * 对象存储入口 9443 由这张 Compose 证书提供服务，浏览器直传前也需要信任它（浏览器不会复用 Node.js 的 NODE_EXTRA_CA_CERTS）。 */
export function ensureComposeCertificate() {
  if (existsSync(caPath)) return caPath
  mkdirSync(dirname(caPath), { recursive: true })
  // 只复制公开证书（私钥保留在 Docker volume）；certificates 容器执行后已存在，无需构建 api 镜像。
  for (const source of ['certificates', 'api']) {
    const copy = spawnSync('docker', ['compose', 'cp', `${source}:/certs/local.crt`, caPath], { cwd: root, stdio: 'ignore' })
    if (copy.status === 0 && existsSync(caPath)) return caPath
  }
  throw new Error(`缺少 ${caPath}。请先启动基础设施容器（pnpm dev:infra），或手动执行：docker compose cp certificates:/certs/local.crt .cache/local.crt`)
}

/** 组装宿主机 API 环境：与 compose.yaml 的 api 服务逐项对齐，仅替换主机名与入口地址。 */
export function buildDevApiEnv({ requireCa = true } = {}) {
  const file = readDotEnv(join(root, '.env'))
  const env = { ...process.env }
  const webPort = file['WEB_PORT'] || '8443'
  const mediaEnabled = (file['MEDIA_ENABLED'] ?? 'true') !== 'false'

  env['HOST'] = '127.0.0.1'
  env['PORT'] = '3000'
  env['PGHOST'] = '127.0.0.1'
  env['PGPORT'] = file['POSTGRES_PORT'] || '5432'
  env['PGDATABASE'] = 'refs_tools'
  env['PGUSER'] = 'refs_tools'
  env['PGPASSWORD'] = required(file, 'POSTGRES_PASSWORD', '复制 .env.example 为 .env 并填写本地密码')
  env['DATABASE_POOL_MAX'] = '5'
  env['AUTH_CHALLENGE_SECRET'] = required(file, 'AUTH_CHALLENGE_SECRET', '复制 .env.example 为 .env 并填写至少 32 字节随机值')
  // 浏览器入口与 Compose 完全一致：认证的 Origin 校验和 __Host- Cookie 都依赖这个精确源。
  env['AUTH_PUBLIC_ORIGIN'] = `https://localhost:${webPort}`
  env['SMTP_HOST'] = '127.0.0.1'
  env['SMTP_PORT'] = file['MAILPIT_SMTP_PORT'] || '1025'
  env['SMTP_FROM'] = 'no-reply@refs-tools.test'
  // 迁移等一次性任务不访问 SMTP/对象存储，不强制要求已复制证书。
  if (requireCa) env['NODE_EXTRA_CA_CERTS'] = ensureComposeCertificate()

  env['MEDIA_ENABLED'] = String(mediaEnabled)
  if (mediaEnabled) {
    const storage = file['MEDIA_STORAGE_PROVIDER'] || 's3'
    env['MEDIA_STORAGE_PROVIDER'] = storage
    env['MEDIA_EVENT_SECRET'] = required(file, 'MEDIA_EVENT_SECRET', '复制 .env.example 为 .env 并填写至少 32 字节随机值')
    if (storage === 's3') {
      // 宿主机没有容器网络，对象存储统一走已发布的 HTTPS 存储入口（签名 Host 与浏览器一致）。
      env['S3_ENDPOINT'] = `https://localhost:${file['MINIO_PORT'] || '9443'}`
      env['S3_PUBLIC_ENDPOINT'] = env['S3_ENDPOINT']
      env['S3_REGION'] = 'us-east-1'
      env['S3_BUCKET'] = 'refs-tools-media'
      env['S3_ACCESS_KEY_ID'] = file['S3_ACCESS_KEY_ID'] || 'refs-local-media'
      env['S3_SECRET_ACCESS_KEY'] = required(file, 'S3_SECRET_ACCESS_KEY', '复制 .env.example 为 .env 并填写本地媒体账号密钥')
    } else {
      // 选择 oss 时沿用 .env 中的云端配置；本地开发不替换端点。
      for (const key of ['OSS_REGION', 'OSS_BUCKET', 'OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET']) {
        if (file[key]) env[key] = file[key]
      }
    }
  }
  // packages/contracts 的 dist/ 是已忽略提交的构建产物；本机未重建时会缺新增导出，
  // Fastify 注册 response schema 时读到 undefined 会直接崩溃。启用其 exports 的 "development" 条件，
  // 让 API 在开发期直接读源码：tsx 会一并监视契约文件，改动即时生效。
  env['NODE_OPTIONS'] = [env['NODE_OPTIONS'], '--conditions=development'].filter(Boolean).join(' ')
  return env
}

function tsxCli() {
  const pkgPath = createRequire(join(apiDir, 'package.json')).resolve('tsx/package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin.tsx
  return join(dirname(pkgPath), bin)
}

export function spawnApi(args = ['watch', 'src/server.ts'], { quiet = false, requireCa = true } = {}) {
  const env = buildDevApiEnv({ requireCa })
  if (!quiet) console.log(`[api] 本机热重载 http://127.0.0.1:${env['PORT']}（Origin ${env['AUTH_PUBLIC_ORIGIN']}）`)
  return spawn(process.execPath, [tsxCli(), ...args], { cwd: apiDir, env, stdio: 'inherit' })
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const task = process.argv[2]
  const migrate = task === 'migrate'
  const args = migrate
    ? ['src/infrastructure/database/migrate.ts', 'up']
    : ['watch', 'src/server.ts']
  try {
    const child = spawnApi(args, { requireCa: !migrate })
    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.once(signal, () => {
        if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
        else child.kill('SIGTERM')
      })
    }
    child.on('exit', (code) => { process.exitCode = code ?? 0 })
  } catch (error) {
    console.error(`[api] ${error.message}`)
    process.exitCode = 1
  }
}
