<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { CertificationReviewSummary } from '@refs-tools/contracts/certifications'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { NAlert, NButton, NSelect } from 'naive-ui'
import { ArrowLeft, ShieldCheck } from '@lucide/vue'
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import UiLoadingRegion from '../../components/ui/UiLoadingRegion.vue'
import UiReasonDialog from '../../components/ui/UiReasonDialog.vue'
import { useUiFeedback } from '../../components/ui/useUiFeedback'
import { useAuthStore } from '../../stores/auth'
import { useAuthGate } from '../../application/useAuthGate'
import { roleLabels } from '../organizations/organizations.presentation'
import CertificationPager from './components/CertificationPager.vue'
import CertificationReviewDetail from './components/CertificationReviewDetail.vue'
import CertificationReviewQueue from './components/CertificationReviewQueue.vue'
import CertificationsSignIn from './components/CertificationsSignIn.vue'
import { certificationStatusText } from './certifications.presentation'
import { useReviewAccess } from './useReviewAccess'
import { useReviewQueues } from './useReviewQueues'
import { useReviewDecision } from './useReviewDecision'

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
const listState = computed(() => review.tab.value === 'records' ? review.records : review.tab.value === 'review' ? review.queue : review.appealQueue)
const activePage = computed(() => review.tab.value === 'records' ? review.recordPage.value : review.tab.value === 'review' ? review.reviewPage.value : review.appealPage.value)
const activeCount = computed(() => review.tab.value === 'records' ? review.recordPageCount.value : review.tab.value === 'review' ? review.reviewPageCount.value : review.appealPageCount.value)
const countOf = (tab: 'review' | 'records' | 'appeal') => (tab === 'records' ? review.records : tab === 'review' ? review.queue : review.appealQueue).data.value?.total ?? 0
const currentUserId = computed(() => user.value?.id ?? '')
const orgNames = computed(() => access.organization.value ? { [access.organization.value.id]: access.organization.value.name } : {})
watch(() => review.tab.value, () => review.close())
const statusOptions = Object.entries(certificationStatusText).filter(([value]) => value !== 'draft').map(([value, item]) => ({ value, label: item.label }))
const nextItem = computed(() => {
  const items = review.currentItems.value, index = items.findIndex(item => item.id === review.selectedId.value)
  return items[index + 1]
})
useUiFeedback(review.action.done)
const detailArea = ref<HTMLElement | null>(null)
const queueArea = ref<HTMLElement | null>(null)
let queueScroll = 0
async function open(item: CertificationReviewSummary) {
  queueScroll = window.scrollY
  await review.open(item)
  await nextTick()
  detailArea.value?.querySelector<HTMLElement>('h2')?.focus()
}
function back() {
  review.close()
  void nextTick(() => { window.scrollTo(0, queueScroll); queueArea.value?.focus({ preventScroll: true }) })
}

const { reason, problem, showDialog, dialogCopy, openDecision, openAppealDecision, closeDialog, confirmDialog } = useReviewDecision(review)
function selectTab(tab: 'review' | 'records' | 'appeal') { if (!review.locked.value && !showDialog.value) review.tab.value = tab }
</script>

<template>
  <NavigationShell>
    <div class="mx-auto grid max-w-[1080px] gap-6">
      <RouterLink :to="`/organizations/${id}`" class="inline-flex min-h-11 w-fit items-center gap-2 text-sm text-body no-underline hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        <ArrowLeft class="size-4" :stroke-width="1.75" aria-hidden="true" />返回组织
      </RouterLink>
      <header class="grid gap-2">
        <p class="m-0 flex items-center gap-2 text-[13px] font-semibold text-body"><ShieldCheck class="size-4" :stroke-width="1.75" aria-hidden="true" />组织认证审核</p>
        <h1 class="m-0 text-[32px] leading-[1.1] font-bold tracking-[-0.03em] text-ink wrap-anywhere focus:outline-hidden compact:text-[32px]">{{ access.organization.value?.name ?? '认证审核' }}</h1>
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
        <div class="flex flex-wrap gap-2" aria-label="审核队列">
          <button v-for="tab in access.tabs.value" :key="tab.id" type="button" :aria-current="review.tab.value === tab.id ? 'page' : undefined" :disabled="review.action.busy.value || showDialog"
            class="inline-flex min-h-11 items-center gap-2 rounded-full border-0 px-5 text-sm transition-[background-color,color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[.98]"
            :class="review.tab.value === tab.id ? 'bg-ink font-semibold text-surface' : 'bg-soft text-body hover:bg-sand hover:text-ink'"
            @click="selectTab(tab.id)">
            {{ tab.label }}<span class="font-mono text-[12px]" :aria-label="`${countOf(tab.id)} 项`">{{ countOf(tab.id) }}</span>
          </button>
        </div>
        <p v-if="review.stale.value" role="status" class="m-0 border-0 border-l border-solid border-ink py-0.5 pl-3 text-[13px] leading-relaxed text-body">
          {{ review.stale.value }}<n-button text type="primary" class="ml-2" @click="review.load(); review.refreshSelected()">重新读取</n-button>
        </p>
        <div class="grid min-w-0 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div ref="queueArea" tabindex="-1" class="min-w-0 gap-4" :class="review.selectedId.value ? 'hidden lg:grid lg:content-start' : 'grid content-start'">
        <n-select v-if="review.tab.value === 'records'" v-model:value="review.status.value" :options="statusOptions" clearable placeholder="全部已提交状态" aria-label="筛选认证状态" :disabled="review.action.busy.value" @update:value="review.go(1)" />
        <UiLoadingRegion v-if="listState.loading.value && !listState.data.value" :loading="true" label="读取审核队列" :lines="4" @retry="listState.load()" />
        <div v-else-if="listState.error.value" class="grid max-w-[560px] gap-3">
          <n-alert type="error" :show-icon="false" role="alert">{{ listState.error.value }}</n-alert>
          <div><n-button type="primary" @click="listState.load()">重新读取</n-button></div>
        </div>
        <template v-else>
          <CertificationReviewQueue :items="review.currentItems.value" :selected-id="review.selectedId.value" :mode="review.tab.value" :disabled="review.action.busy.value || showDialog" @select="open" />
          <CertificationPager :page="activePage" :page-count="activeCount" :busy="listState.loading.value || review.locked.value || showDialog" @go="review.go" />
        </template>
        </div>
        <div ref="detailArea" class="grid min-w-0 content-start gap-4">
        <div v-if="review.selectedId.value" class="flex flex-wrap gap-2">
          <n-button secondary :disabled="review.action.busy.value || showDialog" @click="back">返回队列</n-button>
          <n-button v-if="nextItem" secondary :disabled="review.action.busy.value || showDialog" @click="open(nextItem)">下一条</n-button>
        </div>
        <p v-if="review.action.done.value" role="status" class="m-0 text-base text-ink">{{ review.action.done.value }}</p>
        <UiLoadingRegion v-if="review.detail.loading.value && !review.record.value" :loading="true" label="读取申请材料" :lines="5" />
        <p v-if="!review.selectedId.value" class="m-0 text-sm text-body">从队列选择一条记录，核对材料后作出决定。</p>
        <div v-if="review.detail.error.value && !review.record.value" class="grid max-w-[560px] gap-3 border-0 border-t border-solid border-ink pt-5" role="alert">
          <p class="m-0 text-sm leading-relaxed text-danger">{{ review.detail.error.value }}</p>
          <div><n-button secondary @click="review.selectedId.value ? review.open({ id: review.selectedId.value }) : review.load()">重新读取</n-button></div>
        </div>
        <CertificationReviewDetail v-if="review.record.value" :key="review.record.value.id" :record="review.record.value" :org-names="orgNames" :history-items="review.historyItems.value"
          :history-loading="review.history.loading.value" :history-error="review.history.error.value" :appeal-items="review.appealList.value"
          :appeals-loading="review.appeals.loading.value" :appeals-error="review.appeals.error.value" :mode="review.tab.value"
          :selected-appeal-id="review.selectedAppealId.value" :applicant="review.applicant.value" :current-user-id="currentUserId" :can-read-history="access.isCertifier.value" :busy="review.locked.value || review.detail.loading.value || !!review.stale.value || !!review.detail.error.value" :error="review.action.error.value" :stale="review.stale.value"
          @decide="openDecision" @decide-appeal="openAppealDecision" @retry-history="review.history.load()" @retry-appeals="review.appeals.load()" />
        </div>
        </div>
      </template>
    </div>
    <UiReasonDialog :show="showDialog" v-model:reason="reason" :title="dialogCopy.title" :description="dialogCopy.description"
      :confirm-label="dialogCopy.label" :danger="dialogCopy.danger" :busy="review.action.busy.value" :error="review.action.error.value"
      :problem="problem" @update:show="closeDialog" @confirm="confirmDialog" />
  </NavigationShell>
</template>
