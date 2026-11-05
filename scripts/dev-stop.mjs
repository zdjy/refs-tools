#!/usr/bin/env node
// 清理上次未正常退出的开发进程：只结束祖先链落在本仓库的进程，不动其他程序占用的端口。
// 除了端口监听者，还会清掉 tsx watch 守护进程——否则它会在下次文件变化时重新拉起 API 并再次占用端口。
import { DEV_PORTS, stopDevProcesses } from './dev-process.mjs'

const { stopped, foreign } = stopDevProcesses()

for (const entry of stopped) {
  const where = entry.ports.length > 0 ? `（占用 ${entry.ports.join('、')}）` : ''
  console.log(`[dev:stop] 已结束本仓库开发进程：PID ${entry.pid} ${entry.name}${where}`)
}
for (const entry of foreign) {
  console.log(`[dev:stop] 跳过 ${entry.port} 端口：PID ${entry.pid} ${entry.name} 不属于本仓库，请自行处理`)
  console.log(`[dev:stop]   ${entry.command}`)
}
if (stopped.length === 0 && foreign.length === 0) {
  console.log(`[dev:stop] ${DEV_PORTS.join('、')} 端口均未被占用，没有残留开发进程`)
}
if (foreign.length > 0) process.exitCode = 1
