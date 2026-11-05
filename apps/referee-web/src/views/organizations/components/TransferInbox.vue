<script setup lang="ts">
import { Check, Crown, X } from '@lucide/vue'
import { NButton, NPopconfirm } from 'naive-ui'
import type { OwnershipTransfer } from '@refs-tools/contracts/organization-ownership'
import { cancelButtonProps, confirmButtonProps } from '../../../components/ui/confirm-buttons'
import UiSubmitHint from '../../../components/ui/UiSubmitHint.vue'
import { formatDate } from '../organizations.presentation'

/**
 * 发给本人的所有权移交。接受后你成为负责人，并获得所有者与组织者角色；
 * 原负责人保留普通成员身份。这是权限变化最大的邀请，因此接受也要二次确认，不能一键完成。
 * 回应期间所有按钮互斥，避免同一请求重复提交。
 */
defineProps<{ items: readonly OwnershipTransfer[]; busy: boolean; error: string }>()
const emit = defineEmits<{ respond: [item: OwnershipTransfer, accept: boolean] }>()
</script>

<template>
  <section v-if="items.length" aria-labelledby="transfer-inbox-title" class="grid gap-3 border-0 border-l border-solid border-ink pl-4 compact:p-6">
    <header class="flex items-center gap-3">
      <Crown class="size-5 text-ink" :stroke-width="1.75" aria-hidden="true" />
      <h2 id="transfer-inbox-title" class="m-0 text-lg text-ink">{{ items.length }} 个组织请你接任负责人</h2>
    </header>
    <p class="m-0 text-[13px] leading-relaxed text-ink">接受后你将成为负责人，可管理成员、授予角色并开展组织业务；原负责人保留普通成员身份。</p>
    <p v-if="error" role="alert" class="m-0 border-0 border-l border-solid border-ink py-0.5 pl-3 text-[13px] leading-relaxed text-ink">{{ error }}</p>
    <ul class="m-0 grid list-none gap-3 p-0">
      <li v-for="item in items" :key="item.id" class="grid gap-3 border-0 border-b border-solid border-line pb-4 compact:grid-cols-[minmax(0,1fr)_auto] compact:items-center">
        <div class="grid min-w-0 gap-1">
          <span class="text-base font-bold text-ink wrap-anywhere">{{ item.organizationName }}</span>
          <span class="text-[13px] text-body">由「{{ item.fromDisplayName }}」发起 · {{ formatDate(item.expiresAt) }} 前有效</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <n-popconfirm :positive-button-props="confirmButtonProps" :negative-button-props="cancelButtonProps" positive-text="确认拒绝" negative-text="取消" @positive-click="emit('respond', item, false)">
            <template #trigger><n-button secondary :disabled="busy" :aria-label="`拒绝${item.organizationName}的所有权移交`"><template #icon><X class="size-4" aria-hidden="true" /></template>拒绝</n-button></template>
            拒绝后这次移交即失效，原负责人需要重新发起。
          </n-popconfirm>
          <n-popconfirm :positive-button-props="confirmButtonProps" :negative-button-props="cancelButtonProps" positive-text="确认接任" negative-text="取消" @positive-click="emit('respond', item, true)">
            <template #trigger><n-button type="primary" :disabled="busy" :loading="busy" :aria-label="`接受${item.organizationName}的所有权移交`"><template #icon><Check class="size-4" aria-hidden="true" /></template>接受</n-button></template>
            确认接任负责人？接受后立即生效，你将承担该组织的管理责任。
          </n-popconfirm>
        </div>
      </li>
    </ul>
    <UiSubmitHint :busy="busy" />
  </section>
</template>
