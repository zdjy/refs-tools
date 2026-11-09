<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CertificationAppeal, CertificationDecision } from '@refs-tools/contracts/certifications'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { NAlert, NButton } from 'naive-ui'
import { ArrowLeft, ShieldCheck } from '@lucide/vue'
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import UiLoadingRegion from '../../components/ui/UiLoadingRegion.vue'
import UiReasonDialog from '../../components/ui/UiReasonDialog.vue'
import { useAuthStore } from '../../stores/auth'
import { reasonProblem } from '../../domain/audit-reason'
import { useAuthGate } from '../../application/useAuthGate'
import { roleLabels } from '../organizations/organizations.presentation'
import CertificationPager from './components/CertificationPager.vue'
import CertificationReviewDetail from './components/CertificationReviewDetail.vue'
import CertificationReviewQueue from './components/CertificationReviewQueue.vue'
import CertificationsSignIn from './components/CertificationsSignIn.vue'
import { appealDecisionOptions, decisionLabels, reviewDecisionOptions } from './certifications.presentation'
import { useReviewAccess } from './useReviewAccess'
import { useReviewQueues } from './useReviewQueues'

/**
 * 组织认证审核台：certifier 看待审，owner 看待复核。入口可见性只用于呈现，
 * 队列读取、材料读取与决定仍由 API 按实时授权裁决。
 */
const props = defineProps<{ organizationId: string }>()
const id = computed(() => props.organizationId)
const access = useReviewAccess(id)
const review = useReviewQueues(id, access)
const { user } = storeToRefs(useAuthStore())
const { status, retry } = useAuthGate(async () => {
  if (!await access.load()) return
  const first = access.tabs.value[0]?.id
  if (first && !access.tabs.value.some((item) => item.id === review.tab.value)) review.tab.value = first
  if (access.hasAccess.value) await review.load()
})
const listState = computed(() => review.tab.value === 'review' ? review.queue : review.appealQueue)
const activePage = computed(() => review.tab.value === 'review' ? review.reviewPage.value : review.appealPage.value)
const activeCount = computed(() => review.tab.value === 'review' ? review.reviewPageCount.value : review.appealPageCount.value)
const countOf = (tab: 'review' | 'appeal') => tab === 'review' ? review.queue.data.value?.total ?? 0 : review.appealQueue.data.value?.total ?? 0
const currentUserId = computed(() => user.value?.id ?? '')
const orgNames = computed(() => access.organization.value ? { [access.organization.value.id]: access.organization.value.name } : {})
watch(() => review.tab.value, () => review.close())

type Pending = { kind: 'decision'; decision: CertificationDecision['decision'] }
  | { kind: 'appeal'; appeal: CertificationAppeal; decision: NonNullable<CertificationAppeal['decision']> }
const pending = ref<Pending | null>(null)
const reason = ref('')
const problem = ref('')
const showDialog = ref(false)
const dialogCopy = computed(() => {
  const current = pending.value
  if (!current) return { title: '', description: '', label: '', danger: false }
  if (current.kind === 'decision') {
    const option = reviewDecisionOptions(review.record.value?.status ?? 'draft').find((item) => item.value === current.decision)
    return { title: decisionLabels[current.decision], description: option?.hint ?? '', label: decisionLabels[current.decision], danger: current.decision === 'revoke' }
  }
  const option = appealDecisionOptions().find((item) => item.value === current.decision)
  return { title: `申诉复核：${option?.label ?? ''}`, description: option?.hint ?? '', label: option?.label ?? '提交复核', danger: false }
})
function openDecision(decision: CertificationDecision['decision']) {
  pending.value = { kind: 'decision', decision }
  reason.value = ''; problem.value = ''; showDialog.value = true
}
function openAppealDecision(appeal: CertificationAppeal, decision: NonNullable<CertificationAppeal['decision']>) {
  pending.value = { kind: 'appeal', appeal, decision }
  reason.value = ''; problem.value = ''; showDialog.value = true
}
function closeDialog(visible: boolean) { if (!visible && !review.action.busy.value) { showDialog.value = false; pending.value = null } }
async function confirmDialog() {
  const current = pending.value
  const record = review.record.value
  if (!current || !record) return
  problem.value = reasonProblem(reason.value)
  if (problem.value) return
  const ok = current.kind === 'decision'
    ? await review.decide(record, current.decision, reason.value.trim())
    : await review.decideAppeal(record, current.appeal, current.decision, reason.value.trim())
  if (ok) { showDialog.value = false; pending.value = null; reason.value = '' }
}
function selectTab(tab: 'review' | 'appeal') { review.tab.value = tab }
</script>

<template>
  <NavigationShell>
    <div class="mx-auto grid max-w-[1080px] gap-6">
      <RouterLink :to="`/organizations/${id}`" class="inline-flex min-h-11 w-fit items-center gap-2 text-sm text-body no-underline hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        <ArrowLeft class="size-4" :stroke-width="1.75" aria-hidden="true" />返回组织
      </RouterLink>
      <header class="grid gap-2 border-0 border-l border-solid border-ink pl-4 compact:p-8">
        <p class="m-0 flex items-center gap-2 text-[13px] font-semibold text-body"><ShieldCheck class="size-4" :stroke-width="1.75" aria-hidden="true" />组织认证审核</p>
        <h1 class="m-0 text-[32px] leading-[1.1] font-bold tracking-[-0.03em] text-ink wrap-anywhere focus:outline-hidden compact:text-5xl">{{ access.organization.value?.name ?? '认证审核' }}</h1>
        <p class="m-0 max-w-[64ch] text-sm leading-relaxed text-body">
          审核本组织的认证材料。你不能审核本人申请；申诉由负责人复核，原审核人必须回避。
        </p>
        <ul v-if="access.organization.value?.roles.length" class="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="我在本组织的角色">
          <li v-for="role in access.organization.value.roles" :key="role" class="rounded-full border border-solid border-line bg-surface px-3 py-1 text-[13px] font-medium text-ink">{{ roleLabels[role] }}</li>
        </ul>
      </header>

      <CertificationsSignIn v-if="status !== 'authenticated'" :status="status" @retry="retry" />
      <UiLoadingRegion v-else-if="access.mine.loading.value && !access.mine.data.value" :loading="true" label="读取组织与审核权限" :lines="3" @retry="retry" />
      <div v-else-if="access.mine.error.value && !access.mine.data.value" class="grid max-w-[560px] gap-3">
        <n-alert type="error" :show-icon="false" role="alert">{{ access.mine.error.value }}</n-alert>
        <div><n-button type="primary" @click="retry">重新读取</n-button></div>
      </div>
      <section v-else-if="!access.hasAccess.value" class="grid max-w-[560px] gap-3 border-0 border-t border-solid border-ink pt-6">
        <h2 class="m-0 text-xl text-ink">没有审核权限</h2>
        <p class="m-0 text-sm leading-relaxed text-body">只有本组织的认证员可以审核普通认证，只有负责人可以复核申诉。权限变化后请刷新组织页面。</p>
        <div><RouterLink :to="`/organizations/${id}`" class="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-medium text-surface no-underline hover:bg-black active:scale-95">返回组织</RouterLink></div>
      </section>
      <template v-else>
        <div class="flex flex-wrap gap-2" role="tablist" aria-label="审核队列">
          <button v-for="tab in access.tabs.value" :key="tab.id" type="button" role="tab" :aria-selected="review.tab.value === tab.id"
            :tabindex="review.tab.value === tab.id ? 0 : -1"
            class="inline-flex min-h-11 items-center gap-2 rounded-full border-0 px-5 text-sm transition-[background-color,color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[.98]"
            :class="review.tab.value === tab.id ? 'bg-ink font-semibold text-surface' : 'bg-soft text-body hover:bg-sand hover:text-ink'"
            @click="selectTab(tab.id)">
            {{ tab.label }}<span class="font-mono text-[12px]" :aria-label="`${countOf(tab.id)} 项`">{{ countOf(tab.id) }}</span>
          </button>
        </div>
        <p v-if="review.stale.value" role="status" class="m-0 border-0 border-l border-solid border-ink py-0.5 pl-3 text-[13px] leading-relaxed text-body">
          {{ review.stale.value }}<n-button text type="primary" class="ml-2" @click="review.load()">重新读取</n-button>
        </p>
        <UiLoadingRegion v-if="listState.loading.value && !listState.data.value" :loading="true" label="读取审核队列" :lines="4" @retry="listState.load()" />
        <div v-else-if="listState.error.value && !listState.data.value" class="grid max-w-[560px] gap-3">
          <n-alert type="error" :show-icon="false" role="alert">{{ listState.error.value }}</n-alert>
          <div><n-button type="primary" @click="listState.load()">重新读取</n-button></div>
        </div>
        <template v-else>
          <CertificationReviewQueue :items="review.currentItems.value" :selected-id="review.selectedId.value" :mode="review.tab.value" @select="review.open" />
          <CertificationPager :page="activePage" :page-count="activeCount" :busy="listState.loading.value" @go="review.go" />
        </template>
        <div v-if="review.detail.error.value && !review.record.value" class="grid max-w-[560px] gap-3 border-0 border-t border-solid border-ink pt-5" role="alert">
          <p class="m-0 text-sm leading-relaxed text-danger">{{ review.detail.error.value }}</p>
          <div><n-button secondary @click="review.selectedId.value ? review.open({ id: review.selectedId.value }) : review.load()">重新读取</n-button></div>
        </div>
        <CertificationReviewDetail v-if="review.record.value" :record="review.record.value" :org-names="orgNames" :history-items="review.historyItems.value"
          :history-loading="review.history.loading.value" :history-error="review.history.error.value" :appeal-items="review.appealList.value"
          :appeals-loading="review.appeals.loading.value" :appeals-error="review.appeals.error.value" :mode="review.tab.value"
          :current-user-id="currentUserId" :can-read-history="access.isCertifier.value" :busy="review.action.busy.value" :error="review.action.error.value" :stale="review.stale.value"
          @decide="openDecision" @decide-appeal="openAppealDecision" @retry-history="review.history.load()" @retry-appeals="review.appeals.load()" />
      </template>
    </div>
    <UiReasonDialog :show="showDialog" v-model:reason="reason" :title="dialogCopy.title" :description="dialogCopy.description"
      :confirm-label="dialogCopy.label" :danger="dialogCopy.danger" :busy="review.action.busy.value" :error="review.action.error.value"
      :problem="problem" @update:show="closeDialog" @confirm="confirmDialog" />
  </NavigationShell>
</template>
