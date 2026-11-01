<script setup lang="ts">
import { NButton } from 'naive-ui'
import type { WorkbenchSession } from '../../../domain/workbench'
import { formatDate } from '../workbench.presentation'

defineProps<{ sessions: WorkbenchSession[]; activeId: string; disabled: boolean }>()
const emit = defineEmits<{ create: []; select: [id: string] }>()
</script>

<template>
  <aside class="sidebar" aria-label="比赛会话列表">
    <div class="sidebar-heading">
      <h1>比赛</h1>
      <n-button quaternary circle class="icon-button" aria-label="新建比赛" :disabled="disabled" @click="emit('create')">+</n-button>
    </div>
    <p class="sidebar-caption">仅保存在这台设备</p>
    <ul v-if="sessions.length" class="session-list">
      <li v-for="session in sessions" :key="session.id">
        <n-button quaternary block class="session-item" :aria-pressed="activeId === session.id" @click="emit('select', session.id)">
          <span class="session-copy">
            <span class="session-name">{{ session.title }}</span>
            <span class="session-date">{{ formatDate(session.createdAt) }} · 第 {{ session.period }} 节</span>
          </span>
        </n-button>
      </li>
    </ul>
    <div v-else class="empty-list">
      <p>还没有比赛</p>
      <n-button quaternary :disabled="disabled" @click="emit('create')">创建一场</n-button>
    </div>
    <div class="sidebar-bottom">
      <p>共享设备提示</p>
      <span>赛后请导出需要保留的记录，并清除此设备中的比赛数据。</span>
    </div>
  </aside>
</template>
