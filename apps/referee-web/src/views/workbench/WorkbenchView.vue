<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { refereeControlThemes } from '../../ui-theme'
import { NAlert, NButton, NEmpty, NPopconfirm } from 'naive-ui'
import { useWorkbenchStore } from '../../stores/workbench'
import { useScorerConsole } from './useScorerConsole'
import TeamScorePanel from './components/TeamScorePanel.vue'
import TeamStatPad from './components/TeamStatPad.vue'
import TeamBoxScore from './components/TeamBoxScore.vue'
import { createWorkbenchViewState } from './useWorkbench'
import { clockEntries } from './workbench.presentation'
import WorkbenchSidebar from './components/WorkbenchSidebar.vue'
import WorkbenchClock from './components/WorkbenchClock.vue'
import WorkbenchEventLog from './components/WorkbenchEventLog.vue'
import CreateWorkbenchDialog from './components/CreateWorkbenchDialog.vue'

const workbench = useWorkbenchStore()
const {
  sessions, activeId, now, activeSession, presets, storageError, sessionNotice, restoreFailed, commandError, undoCount,
} = storeToRefs(workbench)
const { formError, createDialogVisible, newRules, startSession } = createWorkbenchViewState(workbench)
const {
  initialize, selectSession, exportSession, retryStorage, removeSession, clearAll,
  switchPeriod, applyPreset, toggleClock, resetClock, clearEventLog,
  recordStat, correctScore, renameTeam, adjustFoul, setPossession, callTimeout, endTimeout, restoreTimeout, toggleLink, editClock, undo, resetMatch,
} = workbench
const { boxScoreVisible, shortcutsEnabled, muted, feedback, sound, toggleMute, exportCsv } = useScorerConsole(workbench)
onMounted(initialize)
</script>

<template>
  <main class="min-h-screen">
    <header class="flex min-h-16 items-center justify-between gap-2 border-0 border-b border-solid border-line bg-surface px-4 py-2 md:px-8">
      <a class="inline-flex min-h-11 items-center gap-2.5 text-[14px] font-bold text-ink no-underline" href="#main" aria-label="裁判工具箱主页"><span class="grid size-7 place-items-center rounded-full bg-ink text-surface">R</span><span>裁判工具箱</span></a>
      <div class="flex items-center gap-2 text-[12px] text-body">
        <span class="hidden sm:inline">本地工作台</span>
        <RouterLink class="inline-flex min-h-11 items-center px-2 py-0 text-[13px] text-body no-underline hover:text-red" to="/account">账号</RouterLink>
        <n-popconfirm positive-text="清空" negative-text="取消" @positive-click="clearAll">
          <template #trigger><n-button quaternary :disabled="!sessions.length && !restoreFailed">清空全部</n-button></template>
          清空本设备的全部比赛会话？此操作无法撤销，请先导出需要保留的记录。
        </n-popconfirm>
      </div>
    </header>
    <section id="main" class="mx-auto grid min-h-[calc(100vh-64px)] max-w-[1280px] grid-cols-[minmax(0,1fr)] md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[248px_minmax(0,1fr)]" tabindex="-1">
      <WorkbenchSidebar :sessions="sessions" :active-id="activeId" :disabled="restoreFailed" @create="createDialogVisible = true" @select="selectSession" />
      <section class="min-w-0 px-3 pt-5 pb-[max(32px,env(safe-area-inset-bottom))] xs:px-4 md:px-6 md:pt-7 md:pb-12 lg:p-8" aria-label="比赛控制台">
        <n-alert v-if="storageError" class="mb-3" type="error" :show-icon="false">
          {{ storageError }}
          <div class="mt-2"><n-button secondary @click="retryStorage">{{ restoreFailed ? '重试读取' : '重试保存' }}</n-button></div>
        </n-alert>
        <n-alert v-if="sessionNotice" class="mb-3" type="info" :show-icon="false">
          {{ sessionNotice }}
          <div class="mt-2"><n-button quaternary @click="sessionNotice = ''">关闭提示</n-button></div>
        </n-alert>
        <template v-if="activeSession">
          <header class="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="mt-0 mr-0 mb-[7px] ml-0 text-[12px] font-[750] text-red">队伍级记录台</p><h2 class="m-0 text-[22px] tracking-[-.02em] wrap-anywhere">{{ activeSession.scorer.teams.home.name }} vs {{ activeSession.scorer.teams.away.name }}</h2>
              <p class="mt-1.5 mr-0 mb-0 ml-0 text-[12px] wrap-anywhere text-body">{{ activeSession.period > activeSession.rules.periodCount ? `加时 ${activeSession.period - activeSession.rules.periodCount}` : `第 ${activeSession.period} 节` }} / {{ activeSession.rules.label }}</p>
              <p class="mt-1.5 mr-0 mb-0 ml-0 text-[12px] wrap-anywhere text-body">规则版本：{{ activeSession.rules.id }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <n-button secondary @click="boxScoreVisible = true">技术统计</n-button>
              <n-button secondary :disabled="!undoCount" @click="undo">撤销 {{ undoCount }}</n-button>
              <n-button secondary @click="exportSession">会话 JSON</n-button>
              <n-popconfirm positive-text="重置整场" negative-text="取消" @positive-click="resetMatch">
                <template #trigger><n-button quaternary>重置整场</n-button></template>
                重置比分、统计、犯规、暂停、节次和日志？队名与规则保留，建议先导出。
              </n-popconfirm>
              <n-popconfirm positive-text="删除" negative-text="取消" @positive-click="removeSession(activeSession.id)">
                <template #trigger><n-button quaternary circle class="size-11" :theme-overrides="refereeControlThemes.iconButton" aria-label="删除当前比赛"><span class="text-[22px]">⌫</span></n-button></template>
                删除这场本地比赛？请先导出需要保留的记录。
              </n-popconfirm>
            </div>
          </header>
          <n-alert v-if="commandError" type="error" :show-icon="false" class="mb-3">{{ commandError }}</n-alert>
          <div class="mx-0 my-3 flex flex-wrap gap-2" aria-label="记录台辅助工具">
            <n-button secondary :aria-pressed="!muted" @click="toggleMute">{{ muted ? '启用声音' : '静音' }}</n-button>
            <n-button secondary @click="sound('whistle')">哨音</n-button>
            <n-button secondary @click="sound('buzzer')">蜂鸣器</n-button>
            <n-button quaternary :aria-pressed="shortcutsEnabled" @click="shortcutsEnabled = !shortcutsEnabled">快捷键{{ shortcutsEnabled ? '已开启' : '已关闭' }}</n-button>
          </div>
          <p v-if="shortcutsEnabled" class="mt-3.5 mr-0 mb-0 ml-0 text-[12px] leading-[1.6] text-body">Space 启停比赛钟 · R/T 重置进攻钟 · P 球权 · H 蜂鸣 · Ctrl/Cmd+Z 撤销。输入或弹窗中不生效。</p>
          <p v-if="feedback" class="rounded-xl bg-sand p-3 text-[13px] text-body" role="status">{{ feedback }}</p>
          <div v-if="activeSession.scorer.timeoutTeam" class="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sand p-4" role="status">
            <strong>{{ activeSession.scorer.teams[activeSession.scorer.timeoutTeam].name }} 暂停中</strong>
            <n-button secondary @click="endTimeout">结束球队暂停</n-button>
          </div>
          <section class="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)] lg:items-stretch" aria-label="球队记分牌">
            <TeamScorePanel v-for="side in (['home', 'away'] as const)" :key="`${activeSession.id}-${side}`"
              :side="side" :team="activeSession.scorer.teams[side]" :period-score="activeSession.scorer.teams[side].periodScores[activeSession.period - 1] ?? 0"
              :fouls="activeSession.fouls[side]" :limit="activeSession.scorer.rules.foulWarningLimit"
              :possession="activeSession.scorer.possession === side" :timeout-active="!!activeSession.scorer.timeoutTeam"
              @stat="recordStat" @correct="correctScore" @foul="adjustFoul" @timeout="callTimeout" @restore="restoreTimeout" @rename="renameTeam" @possession="setPossession" />
          <section class="order-first mt-0 grid grid-cols-[minmax(0,1fr)] gap-3 sm:col-span-full sm:grid-cols-2 lg:order-none lg:col-start-2 lg:col-end-auto lg:row-start-1 lg:grid-cols-[minmax(0,1fr)]" aria-label="计时器">
            <WorkbenchClock v-for="entry in clockEntries" :key="entry.kind" :clock="activeSession.clocks[entry.kind]" :now="now"
              :disabled="entry.kind === 'shot' ? activeSession.scorer.shotLinked : entry.kind === 'timeout' && !!activeSession.scorer.timeoutTeam"
              @toggle="toggleClock" @reset="resetClock" @edit="editClock" />
          </section>
          </section>
          <div class="mt-3 flex min-h-[62px] items-center gap-3.5 rounded-2xl bg-sand px-3.5 py-2 text-[13px] text-body">
            <span>节次</span><strong class="text-[18px] text-ink">{{ String(activeSession.period).padStart(2, '0') }} <small class="text-[12px] font-medium text-body">/ {{ activeSession.rules.periodCount }}</small></strong>
            <div class="ml-auto"><n-popconfirm positive-text="确认换节" negative-text="取消" @positive-click="switchPeriod">
              <template #trigger><n-button secondary>{{ activeSession.period >= activeSession.rules.periodCount ? '进入加时' : '下一节' }}</n-button></template>
              换节将停止并重置时钟，清零本节球队犯规并补足本节暂停。比分和技术统计保留，确认继续？
            </n-popconfirm></div>
          </div>
          <div class="mx-0 my-3 flex flex-wrap gap-2">
            <n-button secondary :aria-pressed="activeSession.scorer.shotLinked" @click="toggleLink">进攻钟：{{ activeSession.scorer.shotLinked ? '联动' : '独立' }}</n-button>
            <n-button v-for="seconds in presets" :key="seconds" secondary @click="applyPreset(seconds)">{{ seconds }} 秒重置</n-button>
            <n-button secondary :disabled="!activeSession.scorer.possession" @click="setPossession(activeSession.scorer.possession === 'home' ? 'away' : 'home', true)">争球 · 切换箭头</n-button>
          </div>
          <p class="mt-3.5 mr-0 mb-0 ml-0 text-[12px] leading-[1.6] text-body">进攻到时、球队犯规和交替拥有箭头仅为辅助提示，不替代裁判最终判断。</p>
          <TeamStatPad :key="activeSession.id" :scorer="activeSession.scorer" @stat="recordStat" />
          <div class="mx-0 my-3 flex flex-wrap gap-2"><n-button secondary @click="exportCsv('events')">导出流水 CSV</n-button></div>
          <WorkbenchEventLog :events="activeSession.events" @clear="clearEventLog" />
          <TeamBoxScore v-model:show="boxScoreVisible" :session="activeSession" @csv="exportCsv('stats')" @json="exportSession" />
        </template>
        <div v-else class="grid min-h-[300px] place-items-center px-3 py-8">
          <n-empty :description="restoreFailed ? '本地记录暂时无法读取' : '还没有比赛'" :show-icon="false">
            <template #extra>
              <n-button type="primary" :disabled="restoreFailed" @click="createDialogVisible = true">新建比赛</n-button>
            </template>
          </n-empty>
        </div>
      </section>
    </section>
    <CreateWorkbenchDialog v-model:show="createDialogVisible" v-model:rules="newRules" :error="formError" @confirm="startSession" />
  </main>
</template>
