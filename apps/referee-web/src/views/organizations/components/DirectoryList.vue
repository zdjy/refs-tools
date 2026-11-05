<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { NButton } from 'naive-ui'
import { Users } from '@lucide/vue'
import type { DirectoryItem } from '@refs-tools/contracts/organization-self'
import { vReveal } from '../../../components/ui/motion/reveal'
import { linkButton } from '../organizations.presentation'

/**
 * 目录行：名称、地区与简介在左，人数在右。人数用 tabular-nums 对齐，不加装饰。
 * 申请加入进行中时所有「申请」按钮互斥；已申请或已是成员的行显示状态而不是按钮。
 */
defineProps<{ items: readonly DirectoryItem[]; busy: boolean }>()
defineEmits<{ join: [item: DirectoryItem] }>()
</script>

<template>
  <ul class="m-0 grid list-none gap-0 overflow-hidden rounded-2xl border border-solid border-line bg-surface p-0 shadow-card">
    <li v-for="(item, index) in items" :key="item.id" v-reveal="{ delay: index * 0.04, y: 12 }"
      class="grid gap-3 border-0 border-b border-solid border-line p-4 last:border-b-0 compact:grid-cols-[minmax(0,1fr)_auto] compact:items-center compact:p-5">
      <div class="grid min-w-0 gap-1.5">
        <h3 class="m-0 text-lg leading-snug font-bold tracking-tight text-ink wrap-anywhere">{{ item.name }}</h3>
        <p class="m-0 flex flex-wrap items-center gap-x-3 text-[13px] text-body">
          <span v-if="item.region">{{ item.region }}</span>
          <span class="inline-flex items-center gap-1 tabular-nums"><Users class="size-3.5" :stroke-width="1.75" aria-hidden="true" />{{ item.memberCount }} 名成员</span>
        </p>
        <p v-if="item.purpose" class="m-0 max-w-[62ch] text-sm leading-relaxed text-body wrap-anywhere">{{ item.purpose }}</p>
      </div>
      <div class="flex items-center">
        <RouterLink v-if="item.relation === 'active'" :to="`/organizations/${item.id}`" :class="linkButton.secondary">已是成员，进入</RouterLink>
        <span v-else-if="item.relation === 'pending'" class="inline-flex min-h-11 items-center rounded-full border border-solid border-line bg-soft px-4 text-sm text-ink">申请待审核</span>
        <n-button v-else type="primary" :disabled="busy" :aria-label="`申请加入${item.name}`" @click="$emit('join', item)">申请加入</n-button>
      </div>
    </li>
  </ul>
</template>
