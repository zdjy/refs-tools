<script setup lang="ts">
import { Check, MailOpen, X } from '@lucide/vue'
import { NButton, NPopconfirm } from 'naive-ui'
import type { OrganizationInvitation } from '@refs-tools/contracts/organization-members'
import { vReveal } from '../../../components/ui/motion/reveal'
import { cancelButtonProps, confirmButtonProps } from '../../../components/ui/confirm-buttons'
import UiSubmitHint from '../../../components/ui/UiSubmitHint.vue'
import { formatDate } from '../organizations.presentation'

/**
 * 待回应的邀请。邀请不携带角色，接受后只成为普通成员；因此在按钮旁写明这一点，
 * 避免用户把「接受邀请」理解成同时获得管理权限。回应期间所有按钮互斥，防止同一邀请重复提交。
 */
defineProps<{ items: readonly OrganizationInvitation[]; busy: boolean; error: string }>()
const emit = defineEmits<{ respond: [item: OrganizationInvitation, accept: boolean] }>()
</script>

<template>
  <section v-if="items.length" aria-labelledby="inbox-title" class="grid gap-3 border-0 border-l border-solid border-ink pl-4 compact:p-6">
    <header class="flex items-center gap-3">
      <MailOpen class="size-5 text-ink" :stroke-width="1.75" aria-hidden="true" />
      <h2 id="inbox-title" class="m-0 text-lg text-ink">{{ items.length }} 个组织邀请你加入</h2>
    </header>
    <p class="m-0 text-[13px] leading-relaxed text-ink">接受后你会成为该组织的普通成员，不会自动获得任何管理权限。</p>
    <p v-if="error" role="alert" class="m-0 border-0 border-l border-solid border-ink py-0.5 pl-3 text-[13px] leading-relaxed text-ink">{{ error }}</p>
    <ul class="m-0 grid list-none gap-3 p-0">
      <li v-for="(item, index) in items" :key="item.id" v-reveal="{ delay: index * 0.06, y: 12 }"
        class="grid gap-3 border-0 border-b border-solid border-line pb-4 compact:grid-cols-[minmax(0,1fr)_auto] compact:items-center">
        <div class="grid min-w-0 gap-1">
          <span class="text-base font-bold text-ink wrap-anywhere">{{ item.organizationName }}</span>
          <span class="text-[13px] text-body">{{ formatDate(item.expiresAt) }} 前有效</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <n-popconfirm :positive-button-props="confirmButtonProps" :negative-button-props="cancelButtonProps" positive-text="确认拒绝" negative-text="取消" @positive-click="emit('respond', item, false)">
            <template #trigger><n-button secondary :disabled="busy" :aria-label="`拒绝${item.organizationName}的邀请`"><template #icon><X class="size-4" aria-hidden="true" /></template>拒绝</n-button></template>
            拒绝后这次邀请即失效，需要对方重新邀请才能加入。
          </n-popconfirm>
          <n-button type="primary" :disabled="busy" :loading="busy" :aria-label="`接受${item.organizationName}的邀请`" @click="emit('respond', item, true)"><template #icon><Check class="size-4" aria-hidden="true" /></template>接受</n-button>
        </div>
      </li>
    </ul>
    <UiSubmitHint :busy="busy" />
  </section>
</template>
