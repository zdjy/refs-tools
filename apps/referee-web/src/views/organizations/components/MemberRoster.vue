<script setup lang="ts">
import { computed } from 'vue'
import { NButton } from 'naive-ui'
import type { Membership } from '@refs-tools/contracts/organization-members'
import { vReveal } from '../../../components/ui/motion/reveal'
import { memberActionLabels, memberActionLabelsFor, memberRowView } from '../members.presentation'
import type { MemberDecision } from '../organizations.presentation'

/**
 * 成员名单：平铺行加细线分段，不套表格外框与表头，与「我的组织」名册同一版式。
 * 每行左侧整体是一个按钮（首字母 + 昵称 + 状态），键盘只多一个焦点停靠点就打开详情；
 * 操作按钮是它的兄弟节点，点击互不干扰，也就不需要靠冒泡拦截来区分意图。
 * 操作只在当前状态允许时出现：待审核给驳回/批准，正式成员给移除（负责人除外）。
 * 入场按行序错开最多 6 行，长名单后段不因序号累积出长时间延迟。
 */
const props = defineProps<{ items: readonly Membership[]; ownerUserId: string; busy: boolean }>()
const emit = defineEmits<{ open: [member: Membership]; decide: [member: Membership, decision: MemberDecision] }>()
const rows = computed(() => props.items.map(member => ({ member, view: memberRowView(member, props.ownerUserId) })))
</script>

<template>
  <ul id="member-list" class="m-0 grid list-none gap-0 border-0 border-y border-solid border-line p-0">
    <li v-for="({ member, view }, index) in rows" :key="view.id" v-reveal="{ delay: Math.min(index, 6) * 0.05, y: 14 }"
      class="group grid grid-cols-1 items-center border-0 border-b border-solid border-line transition-colors duration-200 last:border-b-0 hover:bg-surface compact:grid-cols-[minmax(0,1fr)_auto]">
      <button type="button" class="flex w-full cursor-pointer items-start gap-3 border-0 bg-transparent p-4 text-left font-sans focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent compact:items-center"
        :aria-label="`查看${view.name}的联系资料，当前${view.statusLabel}`" @click="emit('open', member)">
        <span class="grid size-10 shrink-0 place-items-center rounded-full bg-sand text-[15px] font-bold text-ink" aria-hidden="true">{{ view.initial }}</span>
        <span class="grid min-w-0 gap-1">
          <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span class="text-[17px] leading-snug font-semibold tracking-tight text-ink wrap-anywhere underline-offset-4 group-hover:underline">{{ view.name }}</span>
            <span v-if="view.isOwner" class="rounded-full border border-solid border-line bg-soft px-2 py-0.5 text-[13px] text-body">负责人</span>
          </span>
          <span class="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] leading-relaxed text-body">
            <span class="inline-flex items-center gap-1.5">
              <span class="size-1.5 shrink-0 rounded-full" :class="view.statusDot" aria-hidden="true"></span>{{ view.statusLabel }}
            </span>
            <span class="hidden text-body xs:inline" aria-hidden="true">·</span>
            <span>{{ view.datePrefix }} <span class="font-mono">{{ view.dateText }}</span></span>
          </span>
        </span>
      </button>
      <div v-if="view.decisions.length" class="flex flex-wrap gap-2 pb-4 pl-[68px] compact:pl-0 compact:pr-4">
        <n-button v-for="decision in view.decisions" :key="decision" :secondary="decision !== 'approve'" :type="decision === 'approve' ? 'primary' : 'default'"
          :disabled="busy" :aria-label="memberActionLabelsFor[decision](view.name)" @click="emit('decide', member, decision)">{{ memberActionLabels[decision] }}</n-button>
      </div>
    </li>
  </ul>
</template>
