<script setup lang="ts">
import { onMounted, ref, toRef } from 'vue'
import { NAlert, NButton, NInput, NPopconfirm } from 'naive-ui'
import { Search } from '@lucide/vue'
import UiLoadingRegion from '../../../components/ui/UiLoadingRegion.vue'
import UiSubmitHint from '../../../components/ui/UiSubmitHint.vue'
import { useUiFeedback } from '../../../components/ui/useUiFeedback'
import { cancelButtonProps, confirmButtonProps } from '../../../components/ui/confirm-buttons'
import { formatDateTime, transferStatusLabels } from '../organizations.presentation'
import { useOwnershipTransfer } from '../useOwnershipTransfer'

/**
 * 负责人发起所有权移交。移交需要接收人接受后才生效，在此之前你仍是负责人；
 * 同一时刻只能有一个待处理请求，所以有待处理请求时只显示取消入口，不再提供发起表单。
 */
const props = defineProps<{ organizationId: string; ownerUserId: string }>()
const state = useOwnershipTransfer(toRef(props, 'organizationId'), toRef(props, 'ownerUserId'))
const picking = ref(false)
useUiFeedback(state.start.done)
useUiFeedback(state.cancel.done)
onMounted(() => { void state.load() })

async function search() { picking.value = true; await state.findMembers() }
async function submit() { if (await state.begin()) picking.value = false }
</script>

<template>
  <section aria-labelledby="transfer-title" class="grid gap-4">
    <h2 id="transfer-title" class="m-0 text-lg text-ink">移交所有权</h2>
    <p class="m-0 max-w-[68ch] text-sm leading-relaxed text-body">把负责人身份移交给组织的另一位正式成员。对方接受后立即生效：你将失去该组织的全部管理角色并保留普通成员身份，对方获得所有者与组织者角色。</p>
    <p v-if="state.stale.value" role="status" class="m-0 border-0 border-l border-solid border-ink py-0.5 pl-3 text-[13px] leading-relaxed">
      {{ state.stale.value }}<n-button text type="primary" class="ml-2" @click="state.load()">重新读取</n-button>
    </p>
    <n-alert v-if="state.cancel.error.value" type="error" :show-icon="false" role="alert">{{ state.cancel.error.value }}</n-alert>
    <UiLoadingRegion v-if="state.history.loading.value && !state.history.data.value" :loading="true" label="读取移交记录" :lines="3" @retry="state.load()" />
    <div v-else-if="state.history.error.value" class="grid gap-3">
      <n-alert type="error" :show-icon="false" role="alert">{{ state.history.error.value }}</n-alert>
      <div><n-button type="primary" @click="state.load()">重新读取</n-button></div>
    </div>
    <template v-else>
      <section v-if="state.pending.value" aria-labelledby="pending-title" class="grid gap-3 border-0 border-l border-solid border-ink pl-4">
        <h3 id="pending-title" class="m-0 text-base text-ink">等待「{{ state.pending.value.toDisplayName }}」接受</h3>
        <p class="m-0 text-[13px] leading-relaxed text-body">{{ formatDateTime(state.pending.value.expiresAt) }} 前有效，到期未接受将自动失效。接受前你仍是负责人。</p>
        <div>
          <n-popconfirm :positive-button-props="confirmButtonProps" :negative-button-props="cancelButtonProps" positive-text="确认取消" negative-text="保留"
            @positive-click="state.withdraw(state.pending.value!)">
            <template #trigger><n-button secondary :loading="state.cancel.busy.value" :disabled="state.cancel.busy.value">取消这次移交</n-button></template>
            取消后对方将无法再接受，需要时可重新发起。
          </n-popconfirm>
        </div>
        <UiSubmitHint :busy="state.cancel.busy.value" />
      </section>
      <form v-else class="grid gap-3" role="search" @submit.prevent="search">
        <label for="transfer-keyword" class="text-sm font-medium text-ink">选择新负责人（须为正式成员）</label>
        <div class="grid gap-2 compact:grid-cols-[minmax(0,1fr)_auto]">
          <n-input id="transfer-keyword" v-model:value="state.keyword.value" placeholder="输入昵称搜索成员，留空显示全部" clearable :input-props="{ autocomplete: 'off' }" />
          <n-button type="primary" attr-type="submit" :loading="state.members.loading.value"><template #icon><Search class="size-4" aria-hidden="true" /></template>搜索成员</n-button>
        </div>
        <n-alert v-if="state.members.error.value" type="error" :show-icon="false" role="alert">{{ state.members.error.value }}</n-alert>
        <fieldset v-if="picking && state.members.data.value" class="m-0 grid gap-2 border-0 p-0">
          <legend class="mb-1 text-[13px] text-body">{{ state.candidates.value.length ? '选择一位成员' : '没有可选的正式成员' }}</legend>
          <label v-for="member in state.candidates.value" :key="member.userId" class="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-solid border-line px-3 py-2 text-sm text-ink">
            <input v-model="state.selectedId.value" type="radio" name="new-owner" :value="member.userId" class="size-4" />
            <span class="min-w-0 wrap-anywhere">{{ member.displayName }}<span class="ml-2 text-xs text-body">尾号 {{ member.userId.slice(-4) }}</span></span>
          </label>
        </fieldset>
        <n-alert v-if="state.start.error.value" type="error" :show-icon="false" role="alert">{{ state.start.error.value }}</n-alert>
        <div v-if="picking && state.candidates.value.length" class="flex flex-wrap items-center gap-2">
          <n-popconfirm :positive-button-props="confirmButtonProps" :negative-button-props="cancelButtonProps" positive-text="确认发起" negative-text="取消" @positive-click="submit">
            <template #trigger><n-button type="primary" :loading="state.start.busy.value" :disabled="!state.selected.value || state.start.busy.value">发起移交</n-button></template>
            向「{{ state.selected.value?.displayName }}」发起所有权移交？对方接受后你将失去管理权限。
          </n-popconfirm>
        </div>
        <UiSubmitHint :busy="state.start.busy.value" />
      </form>
      <section v-if="state.records.value.length" aria-labelledby="records-title" class="grid gap-2">
        <h3 id="records-title" class="m-0 text-base text-ink">移交记录</h3>
        <ul class="m-0 grid list-none gap-0 overflow-hidden rounded-xl border border-solid border-line p-0">
          <li v-for="item in state.records.value" :key="item.id" class="grid gap-0.5 border-0 border-b border-solid border-line p-3 text-sm last:border-b-0">
            <span class="text-ink wrap-anywhere">「{{ item.fromDisplayName }}」→「{{ item.toDisplayName }}」</span>
            <span class="text-[13px] text-body">{{ transferStatusLabels[item.status] }} · {{ formatDateTime(item.createdAt) }}</span>
          </li>
        </ul>
      </section>
    </template>
  </section>
</template>
