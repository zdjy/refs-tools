<script setup lang="ts">
import { computed } from 'vue'
import { NButton } from 'naive-ui'
import { Search } from '@lucide/vue'
import { rosterFilterOptions, type RosterFilter } from '../organizations.presentation'

/**
 * 名册工具行：关键词只匹配名称与地区，状态胶囊与关键词叠加生效，均在本地完成。
 * 计数为零的分组不显示，但当前选中的分组始终保留，避免点完之后胶囊从界面上消失。
 */
const props = defineProps<{ counts: Record<RosterFilter, number>; matched: number }>()
const keyword = defineModel<string>('keyword', { required: true })
const filter = defineModel<RosterFilter>('filter', { required: true })
const options = computed(() => rosterFilterOptions.filter(option => option.id === 'all' || option.id === filter.value || props.counts[option.id] > 0))
const active = computed(() => filter.value !== 'all' || keyword.value.trim() !== '')
function reset() { keyword.value = ''; filter.value = 'all' }
</script>

<template>
  <div class="grid gap-3">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
      <label for="roster-search" class="sr-only">按名称或地区搜索我的组织</label>
      <div class="flex w-full min-w-0 items-center gap-2 rounded-[10px] border border-solid border-line bg-soft px-3 transition-shadow duration-200 focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/30 compact:w-[300px]">
        <Search class="size-4 shrink-0 text-body" aria-hidden="true" />
        <input id="roster-search" v-model="keyword" type="search" maxlength="60" autocomplete="off" placeholder="搜索名称或地区"
          aria-controls="roster-list" class="min-h-11 w-full min-w-0 border-0 bg-transparent text-base text-ink outline-none placeholder:text-muted" />
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <p class="m-0 text-[13px] text-body" role="status" aria-live="polite" aria-atomic="true">
          <template v-if="active">匹配 <span class="font-mono">{{ matched }}</span> 个</template>
          <template v-else>共 <span class="font-mono">{{ counts.all }}</span> 个组织</template>
        </p>
        <n-button v-if="active" text type="primary" @click="reset">重置筛选</n-button>
      </div>
    </div>
    <div class="flex flex-wrap gap-2" role="group" aria-label="按状态筛选我的组织">
      <button v-for="option in options" :key="option.id" type="button" :aria-pressed="filter === option.id" aria-controls="roster-list"
        class="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 text-[15px] whitespace-nowrap transition-all duration-200 active:scale-95"
        :class="filter === option.id ? 'border border-solid border-ink bg-ink font-semibold text-surface' : 'border border-solid border-line bg-surface/70 font-medium text-body hover:bg-sand hover:text-ink'"
        @click="filter = option.id">
        {{ option.label }}<span class="font-mono text-[13px]" :class="filter === option.id ? 'text-surface/80' : 'text-body'">{{ counts[option.id] }}</span>
      </button>
    </div>
  </div>
</template>
