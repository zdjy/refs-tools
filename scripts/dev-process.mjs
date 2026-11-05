// 本机开发进程的端口占用排查与残留清理。
// `pnpm dev` 被强制中断（关闭终端窗口、nohup、Ctrl+C 只结束了根进程）后，tsx watch 与 Vite 子进程会继续监听
// 3000/8443/8001，下一次启动就只会看到「端口被占用」。这里负责指出真正的占用者并只清理属于本仓库的进程。
import { spawnSync } from 'node:child_process'
import { connect } from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const isWindows = process.platform === 'win32'

/** API、裁判端、管理端的固定端口；strictPort 语义下换端口会让 Origin 校验失败，因此只报错不自选端口。 */
export const DEV_PORTS = [3000, 8443, 8001]

export function portInUse(port) {
  return new Promise((resolve) => {
    const socket = connect({ host: '127.0.0.1', port })
    socket.setTimeout(600)
    socket.once('connect', () => { socket.destroy(); resolve(true) })
    socket.once('timeout', () => { socket.destroy(); resolve(false) })
    socket.once('error', () => resolve(false))
  })
}

/** PowerShell 输出统一压成 JSON，避免在命令行里拼分隔符（命令行本身可能含空格与竖线）。 */
function queryPowerShell(script) {
  const result = spawnSync('powershell', ['-NoProfile', '-Command', script], { encoding: 'utf8' })
  const text = (result.stdout ?? '').trim()
  if (!text) return []
  try {
    const parsed = JSON.parse(text)
    return (Array.isArray(parsed) ? parsed : [parsed]).filter((value) => value !== null && value !== undefined)
  } catch {
    return []
  }
}

/** 一次取回整张进程表，祖先链判断只需在本地内存里走，不必为每个端口反复调用系统工具。 */
function processSnapshot() {
  if (isWindows) {
    const rows = queryPowerShell(
      'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Compress',
    )
    return rows.map((row) => ({
      pid: Number(row.ProcessId),
      parentPid: Number(row.ParentProcessId),
      name: row.Name ?? '',
      command: row.CommandLine ?? '',
    }))
  }
  const out = spawnSync('ps', ['-eo', 'pid=,ppid=,comm=,args='], { encoding: 'utf8' }).stdout ?? ''
  return out.split('\n').map((line) => /^\s*(\d+)\s+(\d+)\s+(\S+)\s*(.*)$/.exec(line))
    .filter(Boolean)
    .map((match) => ({ pid: Number(match[1]), parentPid: Number(match[2]), name: match[3], command: match[4] }))
}

function listeningPids(port) {
  if (isWindows) {
    return queryPowerShell(
      `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ConvertTo-Json -Compress`,
    ).map(Number).filter((pid) => Number.isInteger(pid) && pid > 0)
  }
  const out = spawnSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], { encoding: 'utf8' }).stdout ?? ''
  return out.split('\n').map((line) => Number(line.trim())).filter((pid) => pid > 0)
}

/** Windows 命令行里反斜杠与正斜杠混用，比较前统一归一化，避免漏判自身的旧进程。 */
function normalize(text) {
  const value = text.replace(/\\/g, '/')
  return isWindows ? value.toLowerCase() : value
}

const normalizedRoot = normalize(root)

/** 祖先链中出现仓库路径即为本仓库的开发进程；Compose 容器进程在独立命名空间，不会被误判。 */
function isRepoProcess(byPid, pid) {
  let current = byPid.get(pid)
  for (let depth = 0; current && depth < 16; depth += 1) {
    if (normalize(current.command).includes(normalizedRoot)) return true
    current = byPid.get(current.parentPid)
  }
  return false
}

/** 列出各端口当前的监听者，并标出是否属于本仓库的开发进程。 */
export function findPortListeners(ports = DEV_PORTS) {
  const snapshot = processSnapshot()
  const byPid = new Map(snapshot.map((entry) => [entry.pid, entry]))
  const listeners = []
  for (const port of ports) {
    for (const pid of listeningPids(port)) {
      const entry = byPid.get(pid) ?? { pid, parentPid: 0, name: '', command: '' }
      listeners.push({ port, ...entry, ownedByRepo: isRepoProcess(byPid, pid) })
    }
  }
  return listeners
}

/** taskkill 带 /T 结束整棵子树；开发进程都是父进程带着 tsx/vite 子进程，单杀子进程会被 watch 立即拉回。 */
export function killProcessTree(pid) {
  if (isWindows) spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
  else spawnSync('kill', ['-9', String(pid)], { stdio: 'ignore' })
}

/** 本仓库开发进程的命令行特征：dev 编排、tsx watch 守护、以及不带子命令的 Vite 开发服务器。
 * 只杀监听者不够：tsx watch 在文件变化时会重新拉起 API 并重新占用 3000。 */
function isRepoDevCommand(command) {
  const value = normalize(command)
  if (!value.includes(normalizedRoot)) return false
  if (/scripts\/dev(-api)?\.mjs/.test(value)) return true
  if (/tsx\/dist\/cli\.mjs["']?\s+watch/.test(value)) return true
  if (/vite\/bin\/vite\.js/.test(value)) return !/\s(build|preview|optimize)\b/.test(value)
  return false
}

/** 正在执行清理的进程自身及其祖先进程（`pnpm dev --kill-stale` 就属于特征匹配范围）不能被结束。 */
function protectedPids(byPid) {
  const protectedSet = new Set([process.pid])
  let current = byPid.get(process.pid)
  for (let depth = 0; current && depth < 16; depth += 1) {
    protectedSet.add(current.pid)
    current = byPid.get(current.parentPid)
  }
  return protectedSet
}

/**
 * 结束本仓库的遗留开发进程，其他程序占用的端口保持不动。
 * 先结束监听者，再清理仍存活的开发进程本体（tsx watch 守护进程、dev 编排进程），避免它们稍后重新占用端口。
 * @returns {{ stopped: Array<{pid: number, name: string, ports: number[]}>, foreign: Array<{port: number, pid: number, name: string, command: string}> }}
 */
export function stopDevProcesses(ports = DEV_PORTS) {
  const stopped = new Map()
  const record = (pid, name, port) => {
    const entry = stopped.get(pid) ?? { pid, name, ports: [] }
    if (port !== undefined && !entry.ports.includes(port)) entry.ports.push(port)
    stopped.set(pid, entry)
  }
  const foreign = []
  for (const listener of findPortListeners(ports)) {
    if (!listener.ownedByRepo) {
      foreign.push(listener)
      continue
    }
    killProcessTree(listener.pid)
    record(listener.pid, listener.name, listener.port)
  }

  const snapshot = processSnapshot()
  const byPid = new Map(snapshot.map((entry) => [entry.pid, entry]))
  const keep = protectedPids(byPid)
  const devProcesses = snapshot.filter((entry) => !keep.has(entry.pid) && isRepoDevCommand(entry.command))
  const devPids = new Set(devProcesses.map((entry) => entry.pid))
  for (const entry of devProcesses) {
    // 同一棵树只从根进程结束，避免对已被 taskkill /T 带走的子进程重复操作。
    if (devPids.has(entry.parentPid)) continue
    killProcessTree(entry.pid)
    record(entry.pid, entry.name)
  }
  return { stopped: [...stopped.values()], foreign }
}
