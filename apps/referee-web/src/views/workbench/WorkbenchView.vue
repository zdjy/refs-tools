<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { NAlert, NButton, NEmpty, NPopconfirm } from 'naive-ui'
import { useWorkbenchStore } from '../../stores/workbench'
import { createWorkbenchViewState } from './useWorkbench'
import { clockEntries } from './workbench.presentation'
import './workbench.css'
import WorkbenchSidebar from './components/WorkbenchSidebar.vue'
import WorkbenchClock from './components/WorkbenchClock.vue'
import WorkbenchOperations from './components/WorkbenchOperations.vue'
import WorkbenchEventLog from './components/WorkbenchEventLog.vue'
import CreateWorkbenchDialog from './components/CreateWorkbenchDialog.vue'

const workbench = useWorkbenchStore()
const {
  sessions, activeId, now, activeSession, presets, storageError, sessionNotice, restoreFailed,
} = storeToRefs(workbench)
const { formError, createDialogVisible, newRules, startSession } = createWorkbenchViewState(workbench)
const {
  initialize, selectSession, exportSession, retryStorage, removeSession, clearAll,
  switchPeriod, onFoul, applyPreset, toggleClock, resetClock, clearEventLog,
} = workbench
onMounted(initialize)
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <a class="brand" href="#main" aria-label="裁判工具箱主页"><span class="brand-mark">R</span><span>裁判工具箱</span></a>
      <div class="topbar-meta">
        <span class="local-label">本地工作台</span>
        <n-popconfirm positive-text="清空" negative-text="取消" @positive-click="clearAll">
          <template #trigger><n-button quaternary :disabled="!sessions.length && !restoreFailed">清空全部</n-button></template>
          清空本设备的全部比赛会话？此操作无法撤销，请先导出需要保留的记录。
        </n-popconfirm>
      </div>
    </header>
    <section id="main" class="workspace" tabindex="-1">
      <WorkbenchSidebar :sessions="sessions" :active-id="activeId" :disabled="restoreFailed" @create="createDialogVisible = true" @select="selectSession" />
      <section class="main-panel" aria-label="比赛控制台">
        <n-alert v-if="storageError" class="notice" type="error" :show-icon="false">
          {{ storageError }}
          <div class="notice-actions"><n-button secondary @click="retryStorage">{{ restoreFailed ? '重试读取' : '重试保存' }}</n-button></div>
        </n-alert>
        <n-alert v-if="sessionNotice" class="notice" type="info" :show-icon="false">
          {{ sessionNotice }}
          <div class="notice-actions"><n-button quaternary @click="sessionNotice = ''">关闭提示</n-button></div>
        </n-alert>
        <template v-if="activeSession">
          <header class="match-header">
            <div>
              <p class="eyebrow">场边工作台</p><h2>{{ activeSession.title }}</h2>
              <p class="match-subtitle">第 {{ activeSession.period }} 节 / {{ activeSession.rules.label }}</p>
              <p class="rules-version">规则版本：{{ activeSession.rules.id }}</p>
            </div>
            <div class="header-actions">
              <n-button secondary @click="exportSession">导出</n-button>
              <n-popconfirm positive-text="删除" negative-text="取消" @positive-click="removeSession(activeSession.id)">
                <template #trigger><n-button quaternary circle class="icon-button" aria-label="删除当前比赛">⌫</n-button></template>
                删除这场本地比赛？请先导出需要保留的记录。
              </n-popconfirm>
            </div>
          </header>
          <section class="clock-grid" aria-label="计时器">
            <WorkbenchClock v-for="entry in clockEntries" :key="entry.kind" :clock="activeSession.clocks[entry.kind]" :now="now" @toggle="toggleClock" @reset="resetClock" />
          </section>
          <div class="period-strip">
            <span>节次</span><strong>{{ String(activeSession.period).padStart(2, '0') }} <small>/ {{ activeSession.rules.periodCount }}</small></strong>
            <n-button secondary @click="switchPeriod">下一节</n-button>
          </div>
          <WorkbenchOperations :fouls="activeSession.fouls" :presets="presets" @foul="onFoul" @preset="applyPreset" />
          <WorkbenchEventLog :events="activeSession.events" @clear="clearEventLog" />
        </template>
        <div v-else class="no-session">
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
