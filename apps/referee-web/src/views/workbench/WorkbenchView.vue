<script setup lang="ts">
import { onMounted } from 'vue'
import SkipLink from '../../components/navigation/SkipLink.vue'
import BrandLink from '../../components/navigation/BrandLink.vue'
import { useUiFeedback } from '../../components/ui/useUiFeedback'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { NAlert, NButton, NPopconfirm } from 'naive-ui'
import { useWorkbenchStore } from '../../stores/workbench'
import { useScorerConsole } from './useScorerConsole'
import TeamScorePanel from './components/TeamScorePanel.vue'
import TeamStatPad from './components/TeamStatPad.vue'
import TeamBoxScore from './components/TeamBoxScore.vue'
import { createWorkbenchViewState } from './useWorkbench'
import { clockEntries, periodLabel } from './workbench.presentation'
import WorkbenchScoreStrip from './components/WorkbenchScoreStrip.vue'
import WorkbenchMoreActions from './components/WorkbenchMoreActions.vue'
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
  initialize, selectSession, exportSession, exportRawData, retryStorage, removeSession, clearAll,
  switchPeriod, applyPreset, toggleClock, resetClock, clearEventLog,
  recordStat, correctScore, renameTeam, adjustFoul, setPossession, callTimeout, endTimeout, restoreTimeout, toggleLink, editClock, undo, resetMatch,
} = workbench
const { boxScoreVisible, shortcutsEnabled, muted, feedback, sound, toggleMute, exportCsv } = useScorerConsole(workbench)
useUiFeedback(sessionNotice, 'info')
onMounted(initialize)
</script>

<template>
  <main class="min-h-screen">
    <SkipLink />
    <header class="flex min-h-16 items-center justify-between gap-2 border-0 border-b border-solid border-line bg-canvas/90 px-4 py-2 backdrop-blur-md tablet:sticky tablet:top-0 tablet:z-40 md:px-8">
      <BrandLink label="裁判工具箱首页" />
      <div class="flex items-center gap-2 text-[13px] text-body">
        <span class="hidden sm:inline">本地工作台</span>
        <RouterLink class="inline-flex min-h-11 min-w-11 items-center justify-center px-2 py-0 text-[13px] text-body no-underline hover:text-accent-hover" to="/account">账号</RouterLink>
      </div>
    </header>
    <section id="main" class="mx-auto grid min-h-[calc(100vh-64px)] max-w-[1280px] grid-cols-[minmax(0,1fr)] tablet:grid-cols-[208px_minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)] 2xl:max-w-[1440px]" tabindex="-1">
      <WorkbenchSidebar :sessions="sessions" :active-id="activeId" :disabled="restoreFailed" :can-clear="!!sessions.length || restoreFailed" @create="createDialogVisible = true" @select="selectSession" @clear="clearAll" />
      <section class="min-w-0 px-3 pt-5 pb-[max(32px,env(safe-area-inset-bottom))] xs:px-4 compact:px-5 md:px-6 md:pt-7 md:pb-12 xl:p-8" aria-label="比赛控制台">
        <n-alert v-if="storageError" class="mb-3" type="error" :show-icon="false">
          {{ storageError }}
          <div class="mt-2 flex flex-wrap gap-2">
            <n-button v-if="restoreFailed" secondary @click="exportRawData">导出原始数据</n-button>
            <n-button secondary @click="retryStorage">{{ restoreFailed ? '重试读取' : '重试保存' }}</n-button>
          </div>
        </n-alert>
        <div v-if="sessionNotice" class="mb-3 border-0 border-l border-solid border-line pl-4 text-sm text-body" role="status">
          {{ sessionNotice }}
          <div class="mt-2"><n-button quaternary @click="sessionNotice = ''">关闭提示</n-button></div>
        </div>
        <template v-if="activeSession">
          <WorkbenchScoreStrip :session="activeSession" :now="now" @toggle="toggleClock('game')" @reset-shot="applyPreset" />
          <header class="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-ink m-0 text-[22px] tracking-[-.02em] wrap-anywhere">{{ activeSession.scorer.teams.home.name }} vs {{ activeSession.scorer.teams.away.name }}</h2>
              <p class="mt-1.5 mr-0 mb-0 ml-0 text-[13px] wrap-anywhere text-body">{{ periodLabel(activeSession.period, activeSession.rules.periodCount) }} / {{ activeSession.rules.label }}</p>
              <p class="mt-1.5 mr-0 mb-0 ml-0 text-[13px] wrap-anywhere text-body">规则版本：{{ activeSession.rules.id }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <n-button secondary @click="boxScoreVisible = true">技术统计</n-button>
              <n-button secondary :disabled="!undoCount" @click="undo">撤销 {{ undoCount }}</n-button>
            </div>
          </header>
          <n-alert v-if="commandError" type="error" :show-icon="false" class="mb-3">{{ commandError }}</n-alert>
          <WorkbenchMoreActions
            :muted="muted" :shortcuts-enabled="shortcutsEnabled" @export-session="exportSession" @reset-match="resetMatch" @remove-session="removeSession(activeSession.id)"
            @toggle-mute="toggleMute" @whistle="sound('whistle')" @buzzer="sound('buzzer')" @toggle-shortcuts="shortcutsEnabled = !shortcutsEnabled" />
          <p v-if="feedback" class="border-0 border-l border-solid border-ink py-0.5 pl-3 text-[13px] text-body" role="status">{{ feedback }}</p>
          <div v-if="activeSession.scorer.timeoutTeam" class="mb-3 flex flex-wrap items-center justify-between gap-3 border-0 border-l border-solid border-ink py-1 pl-4" role="status">
            <strong>{{ activeSession.scorer.teams[activeSession.scorer.timeoutTeam].name }} 暂停中</strong>
            <n-button secondary @click="endTimeout">结束球队暂停</n-button>
          </div>
          <section class="grid grid-cols-[minmax(0,1fr)] gap-3 xs:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)] xl:items-stretch" aria-label="球队记分牌">
            <TeamScorePanel v-for="side in (['home', 'away'] as const)" :key="`${activeSession.id}-${side}`"
              :side="side" :team="activeSession.scorer.teams[side]" :period-score="activeSession.scorer.teams[side].periodScores[activeSession.period - 1] ?? 0"
              :fouls="activeSession.fouls[side]" :limit="activeSession.scorer.rules.foulWarningLimit"
              :possession="activeSession.scorer.possession === side" :timeout-active="!!activeSession.scorer.timeoutTeam"
              @stat="recordStat" @correct="correctScore" @foul="adjustFoul" @timeout="callTimeout" @restore="restoreTimeout" @rename="renameTeam" @possession="setPossession" />
          <section class="mt-0 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xs:col-span-full md:grid-cols-3 tablet:order-first xl:order-none xl:col-start-2 xl:col-end-auto xl:row-start-1 xl:grid-cols-[minmax(0,1fr)]" aria-label="计时器">
            <WorkbenchClock v-for="entry in clockEntries" :key="entry.kind" :clock="activeSession.clocks[entry.kind]" :now="now"
              :disabled="entry.kind === 'shot' ? activeSession.scorer.shotLinked : entry.kind === 'timeout' && !!activeSession.scorer.timeoutTeam"
              @toggle="toggleClock" @reset="resetClock" @edit="editClock" />
          </section>
          </section>
          <div class="mt-3 flex min-h-[62px] items-center gap-3.5 border-0 border-l border-solid border-ink py-2 pl-3.5 text-[13px] text-body">
            <span>节次</span><strong class="text-[18px] text-ink">{{ String(activeSession.period).padStart(2, '0') }} <small class="text-[13px] font-medium text-body">/ {{ activeSession.rules.periodCount }}</small></strong>
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
          <p class="mt-3.5 mr-0 mb-0 ml-0 text-[13px] leading-[1.6] text-body">进攻到时、球队犯规和交替拥有箭头仅为辅助提示，不替代裁判最终判断。</p>
          <TeamStatPad :key="activeSession.id" :scorer="activeSession.scorer" @stat="recordStat" />
          <div class="mx-0 my-3 flex flex-wrap gap-2"><n-button secondary @click="exportCsv('events')">导出流水 CSV</n-button></div>
          <WorkbenchEventLog :events="activeSession.events" @clear="clearEventLog" />
          <TeamBoxScore v-model:show="boxScoreVisible" :session="activeSession" @csv="exportCsv('stats')" @json="exportSession" />
        </template>
        <div v-else class="grid min-h-[320px] items-center border-0 border-l border-solid border-ink py-10 pl-5 compact:pl-10">
          <div class="grid max-w-[360px] justify-items-start gap-2">
            <h2 class="m-0 text-xl font-bold text-ink">{{ restoreFailed ? '本地记录暂时无法读取' : '还没有比赛' }}</h2>
            <p class="m-0 text-sm leading-relaxed text-body">{{ restoreFailed ? '请先导出原始数据，再重试读取。' : '新建一场比赛后即可记分、计时并记录犯规，数据只保存在这台设备。' }}</p>
            <n-button class="mt-3" type="primary" :disabled="restoreFailed" @click="createDialogVisible = true">新建比赛</n-button>
          </div>
        </div>
      </section>
    </section>
    <CreateWorkbenchDialog v-model:show="createDialogVisible" v-model:rules="newRules" :error="formError" @confirm="startSession" />
  </main>
</template>
