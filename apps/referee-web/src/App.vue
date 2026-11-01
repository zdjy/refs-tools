<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  ACTIVE_SESSION_KEY,
  DEFAULT_RULES,
  STORAGE_KEY,
  addFoul,
  createSession,
  elapsedMs,
  formatClock,
  remainingMs,
  resetClock,
  toggleClock,
  withEvent,
  type ClockKind,
  type FoulCount,
  type WorkbenchSession,
} from './domain/workbench'

const sessions = ref<WorkbenchSession[]>([])
const activeId = ref('')
const now = ref(Date.now())
const storageError = ref('')
const sessionNotice = ref('')
const exportLink = ref('')
const dialog = ref(false)
const newRules = ref({ periodCount: DEFAULT_RULES.periodCount, periodMinutes: 10, shotSeconds: 24, shortShotSeconds: 14 })
let ticker: number | undefined
let exportUrl: string | undefined

const activeSession = computed(() => sessions.value.find((session) => session.id === activeId.value) ?? null)
const clockEntries: Array<{ kind: ClockKind; label: string }> = [
  { kind: 'game', label: '比赛计时' },
  { kind: 'shot', label: '进攻计时' },
  { kind: 'timeout', label: '暂停计时' },
]
const shotPresets = computed(() => activeSession.value ? [...new Set([
  activeSession.value.rules.shotClockDurationMs / 1000,
  activeSession.value.rules.shortShotClockDurationMs / 1000,
  8,
])] : [])

function persist() {
  if (!activeSession.value) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.value))
    localStorage.setItem(ACTIVE_SESSION_KEY, activeId.value)
    storageError.value = ''
  } catch {
    storageError.value = '本地存储不可用或空间不足。当前更改不会在刷新后保留，请导出会话数据。'
  }
}

function updateSession(updater: (session: WorkbenchSession, at: number) => WorkbenchSession) {
  if (!activeSession.value) return
  const at = Date.now()
  const updated = updater(activeSession.value, at)
  sessions.value = sessions.value.map((session) => session.id === activeId.value ? updated : session)
}

function startSession() {
  try {
    const at = Date.now()
    const rules = {
      id: `custom-${at}`,
      label: '自定义规则参数',
      periodCount: Math.max(1, Math.min(12, Number(newRules.value.periodCount) || 4)),
      periodDurationMs: Math.max(1, Number(newRules.value.periodMinutes) || 10) * 60_000,
      shotClockDurationMs: Math.max(1, Number(newRules.value.shotSeconds) || 24) * 1000,
      shortShotClockDurationMs: Math.max(1, Number(newRules.value.shortShotSeconds) || 14) * 1000,
    }
    const session = createSession(at, rules)
    sessions.value = [session, ...sessions.value]
    activeId.value = session.id
    dialog.value = false
    sessionNotice.value = ''
    persist()
  } catch {
    storageError.value = '浏览器无法创建本地比赛会话。请检查存储权限后重试。'
  }
}

function switchPeriod() {
  updateSession((session, at) => {
    const period = session.period >= session.rules.periodCount ? 1 : session.period + 1
    const game = resetClock({ ...session.clocks.game, durationMs: session.rules.periodDurationMs })
    const next = {
      ...session,
      period,
      fouls: { home: 0, away: 0 },
      clocks: { ...session.clocks, game, shot: resetClock({ ...session.clocks.shot, durationMs: session.rules.shotClockDurationMs }) },
    }
    return withEvent(next, { id: `event-${at}`, at, label: `进入第 ${period} 节` }, at)
  })
}

function recordEvent(label: string, detail?: string) {
  updateSession((session, at) => withEvent(session, { id: `event-${at}`, at, label, ...(detail ? { detail } : {}) }, at))
}

function onFoul(team: keyof FoulCount) {
  updateSession((session, at) => addFoul(session, team, at))
}

function applyPreset(seconds: number) {
  updateSession((session, at) => {
    const shot = resetClock({ ...session.clocks.shot, durationMs: seconds * 1000 })
    return withEvent({ ...session, clocks: { ...session.clocks, shot } }, { id: `event-${at}`, at, label: `进攻计时设置为 ${seconds} 秒`, detail: '操作提示，不代表最终裁决' }, at)
  })
}

function clearEventLog() {
  if (!activeSession.value || !window.confirm('清除当前比赛的操作日志？此操作不可撤销。')) return
  updateSession((session) => ({ ...session, events: [] }))
}

function selectSession(id: string) {
  activeId.value = id
  sessionNotice.value = ''
}

function removeSession(id: string) {
  if (!window.confirm('删除这场本地比赛？此操作不可撤销。')) return
  sessions.value = sessions.value.filter((session) => session.id !== id)
  activeId.value = sessions.value[0]?.id ?? ''
  if (activeId.value) persist()
  else {
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(ACTIVE_SESSION_KEY)
      storageError.value = ''
    } catch {
      storageError.value = '无法访问本地存储，未能删除记录。'
    }
  }
}

function clearAll() {
  if (!sessions.value.length || !window.confirm('清空本设备的全部比赛会话？此操作不可撤销。')) return
  sessions.value = []
  activeId.value = ''
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(ACTIVE_SESSION_KEY)
    storageError.value = ''
    sessionNotice.value = ''
  } catch {
    storageError.value = '无法访问本地存储，未能清空记录。'
  }
}

function exportSession() {
  if (!activeSession.value) return
  if (exportUrl) URL.revokeObjectURL(exportUrl)
  const payload = new Blob([JSON.stringify(activeSession.value, null, 2)], { type: 'application/json' })
  exportUrl = URL.createObjectURL(payload)
  exportLink.value = exportUrl
  const link = document.createElement('a')
  link.href = exportUrl
  link.download = `比赛工作台-${new Date(activeSession.value.createdAt).toISOString().slice(0, 10)}.json`
  link.click()
  sessionNotice.value = '会话已导出。导出文件可能包含比赛数据，请妥善保管。'
}

function restore() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed: unknown = JSON.parse(saved)
      if (!Array.isArray(parsed)) throw new Error('invalid')
      sessions.value = parsed as WorkbenchSession[]
    }
    const savedId = localStorage.getItem(ACTIVE_SESSION_KEY)
    activeId.value = sessions.value.some((session) => session.id === savedId) ? savedId ?? '' : sessions.value[0]?.id ?? ''
    if (activeId.value) sessionNotice.value = '已恢复本地比赛会话。数据保存在此设备，不会自动同步到业务比赛记录。'
  } catch {
    storageError.value = '读取本地比赛记录失败。旧数据保持不变，请导出可读取的会话后再清理。'
  }
}

function formatTime(at: number) {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(at)
}

watch([sessions, activeId], persist, { deep: true })
onMounted(() => {
  restore()
  ticker = window.setInterval(() => { now.value = Date.now() }, 100)
})
onUnmounted(() => {
  if (ticker !== undefined) window.clearInterval(ticker)
  if (exportUrl) URL.revokeObjectURL(exportUrl)
})
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <a class="brand" href="#main" aria-label="裁判工具箱主页"><span class="brand-mark">R</span><span>裁判工具箱</span></a>
      <div class="topbar-meta"><span class="connection-dot"></span><span>离线工作台</span><button class="text-button" type="button" @click="clearAll">清空全部</button></div>
    </header>

    <section id="main" class="workspace">
      <aside class="sidebar" aria-label="比赛会话列表">
        <div class="sidebar-heading"><h1>比赛</h1><button class="icon-button" type="button" aria-label="新建比赛" title="新建比赛" @click="dialog = true">+</button></div>
        <p class="sidebar-caption">仅保存在这台设备</p>
        <ul v-if="sessions.length" class="session-list">
          <li v-for="session in sessions" :key="session.id">
            <button class="session-item" :class="{ selected: activeId === session.id }" type="button" @click="selectSession(session.id)">
              <span class="session-name">{{ session.title }}</span><span class="session-date">{{ new Date(session.createdAt).toLocaleDateString('zh-CN') }} · 第 {{ session.period }} 节</span>
            </button>
          </li>
        </ul>
        <div v-else class="empty-list"><span class="empty-mark">+</span><p>还没有比赛</p><button class="link-button" type="button" @click="dialog = true">创建一场</button></div>
        <div class="sidebar-bottom"><div class="privacy-icon" aria-hidden="true">◈</div><p>共享设备提示</p><span>赛后请导出需要保留的记录，并清除此设备中的比赛数据。</span></div>
      </aside>

      <section v-if="activeSession" class="main-panel" aria-label="比赛控制台">
        <div v-if="storageError" class="notice notice-error" role="alert">{{ storageError }}</div>
        <div v-if="sessionNotice" class="notice notice-info" role="status"><span>{{ sessionNotice }}</span><button type="button" class="notice-close" aria-label="关闭提示" @click="sessionNotice = ''">×</button></div>
        <header class="match-header">
          <div><p class="eyebrow">场边工作台</p><h2>{{ activeSession.title }}</h2><p class="match-subtitle">第 {{ activeSession.period }} 节 <span class="separator">/</span> {{ activeSession.rules.label }}</p></div>
          <div class="header-actions"><button class="secondary-button" type="button" @click="exportSession"><span aria-hidden="true">↓</span> 导出</button><button class="danger-quiet" type="button" aria-label="删除当前比赛" title="删除比赛" @click="removeSession(activeSession.id)">⌫</button></div>
        </header>

        <section class="clock-grid" aria-label="计时器">
          <article v-for="entry in clockEntries" :key="entry.kind" class="clock-panel" :class="{ 'clock-running': activeSession.clocks[entry.kind].status === 'running', 'clock-expired': remainingMs(activeSession.clocks[entry.kind], now) === 0 && activeSession.clocks[entry.kind].status !== 'idle' }">
            <div class="clock-title"><span>{{ entry.label }}</span><span class="clock-state">{{ activeSession.clocks[entry.kind].status === 'running' ? '进行中' : activeSession.clocks[entry.kind].status === 'paused' ? '已暂停' : '待开始' }}</span></div>
            <div class="clock-value" role="timer" aria-live="off">{{ formatClock(remainingMs(activeSession.clocks[entry.kind], now)) }}</div>
            <div class="clock-controls"><button class="primary-button" type="button" @click="updateSession((session, at) => ({ ...session, clocks: { ...session.clocks, [entry.kind]: toggleClock(session.clocks[entry.kind], at) }, updatedAt: at }))">{{ activeSession.clocks[entry.kind].status === 'running' ? '暂停' : '开始' }}</button><button class="reset-button" type="button" :aria-label="`重置${entry.label}`" title="重置" @click="updateSession((session, at) => ({ ...session, clocks: { ...session.clocks, [entry.kind]: resetClock(session.clocks[entry.kind]) }, updatedAt: at }))">↺</button></div>
          </article>
        </section>

        <div class="period-strip"><span>节次</span><strong>{{ String(activeSession.period).padStart(2, '0') }} <small>/ {{ String(activeSession.rules.periodCount).padStart(2, '0') }}</small></strong><button class="secondary-button" type="button" @click="switchPeriod">下一节 <span aria-hidden="true">→</span></button></div>

        <div class="operations-grid">
          <section class="operation-section foul-section"><div class="section-heading"><div><p class="eyebrow">赛事记录</p><h3>球队犯规</h3></div><span class="section-note">本节</span></div><div class="foul-teams"><div class="team-row"><div><span class="team-name">主队</span><span class="foul-total">{{ activeSession.fouls.home }}</span></div><button class="secondary-button" type="button" @click="onFoul('home')"><span aria-hidden="true">+</span> 记录犯规</button></div><div class="team-row"><div><span class="team-name">客队</span><span class="foul-total">{{ activeSession.fouls.away }}</span></div><button class="secondary-button" type="button" @click="onFoul('away')"><span aria-hidden="true">+</span> 记录犯规</button></div></div></section>

          <section class="operation-section shot-section"><div class="section-heading"><div><p class="eyebrow">计时辅助</p><h3>进攻计时</h3></div></div><p class="shot-caption">快速重置 <span>·</span> 以当前配置为准</p><div class="preset-row"><button v-for="seconds in shotPresets" :key="seconds" class="preset-button" type="button" @click="applyPreset(seconds)">{{ seconds }}<span>秒</span></button></div><p class="rules-note">计时提示不替代裁判对比赛规则的最终判断。</p></section>
        </div>

        <section class="event-section"><div class="section-heading"><div><p class="eyebrow">现场记录</p><h3>操作日志</h3></div><div class="event-actions"><span class="event-count">{{ activeSession.events.length }} 条</span><button v-if="activeSession.events.length" class="link-button" type="button" @click="clearEventLog">清除日志</button></div></div><div v-if="activeSession.events.length" class="event-table"><div v-for="event in activeSession.events" :key="event.id" class="event-row"><time>{{ formatTime(event.at) }}</time><strong>{{ event.label }}</strong><span>{{ event.detail ?? '' }}</span></div></div><p v-else class="empty-events">暂无操作记录</p></section>
      </section>
      <section v-else class="no-session"><div class="empty-mark">+</div><h2>开始一场比赛</h2><p>创建本地工作台，准备记录计时与现场事件。</p><button class="primary-button" type="button" @click="dialog = true">新建比赛</button></section>
    </section>

    <div v-if="dialog" class="dialog-backdrop" @click.self="dialog = false">
      <section class="create-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><button class="dialog-close" type="button" aria-label="关闭" @click="dialog = false">×</button><p class="eyebrow">新建会话</p><h2 id="dialog-title">比赛工作台</h2><p class="dialog-copy">新会话将保存本次配置。计时规则可按赛事要求调整。</p><div class="rule-form"><label>比赛节数<input v-model.number="newRules.periodCount" type="number" min="1" max="12" /></label><label>每节分钟<input v-model.number="newRules.periodMinutes" type="number" min="1" max="60" /></label><label>进攻计时（秒）<input v-model.number="newRules.shotSeconds" type="number" min="1" max="60" /></label><label>短进攻计时（秒）<input v-model.number="newRules.shortShotSeconds" type="number" min="1" max="60" /></label></div><div class="dialog-footer"><button class="secondary-button" type="button" @click="dialog = false">取消</button><button class="primary-button" type="button" @click="startSession">创建比赛</button></div></section>
    </div>
    <a v-if="exportLink" class="sr-only" :href="exportLink" download tabindex="-1" aria-hidden="true">导出文件</a>
  </main>
</template>
