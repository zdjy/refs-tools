<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { NAlert, NButton } from 'naive-ui'
import type { Certification, CertificationSummary, CreateCertification, UpdateCertification } from '@refs-tools/contracts/certifications'
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import UiLoadingRegion from '../../components/ui/UiLoadingRegion.vue'
import UiPageBanner from '../../components/ui/UiPageBanner.vue'
import { useUiFeedback } from '../../components/ui/useUiFeedback'
import CertificationAppealDialog from './components/CertificationAppealDialog.vue'
import CertificationDetail from './components/CertificationDetail.vue'
import CertificationForm from './components/CertificationForm.vue'
import CertificationList from './components/CertificationList.vue'
import CertificationPager from './components/CertificationPager.vue'
import CertificationsSignIn from './components/CertificationsSignIn.vue'
import { uploadOptionsFor } from './useCertificationDraft'
import { useCertifications } from './useCertifications'
import { useAuthGate } from '../../application/useAuthGate'

const c = useCertifications()
const route = useRoute()
const { status, retry } = useAuthGate(() => c.load())
useUiFeedback(c.action.done)
type Mode = 'detail' | 'create' | 'edit'
const mode = ref<Mode>('detail')
const createScope = ref<'organization' | 'platform'>('organization')
const formKey = ref(0)
const detailArea = ref<HTMLElement | null>(null)
const formArea = ref<HTMLElement | null>(null)
const routeOrganizationId = computed(() => typeof route.query['organizationId'] === 'string' ? route.query['organizationId'] : null)
const showAppeal = ref(false)
const appealRecord = ref<Certification | null>(null)

const takenOrganizationIds = computed(() => c.items.value.filter((item) => item.scope.type === 'organization')
  .map((item) => item.scope.organizationId).filter((value): value is string => !!value))
const platformTaken = computed(() => c.items.value.some((item) => item.scope.type === 'platform'))
const defaultScope = computed<'organization' | 'platform'>(() => c.activeOrganizations.value.length ? 'organization' : 'platform')
const appealUploadOptions = computed(() => uploadOptionsFor({
  scopeType: appealRecord.value?.scope.type ?? 'platform',
  organizationId: appealRecord.value?.scope.organizationId ?? null,
}))
const flow = [
  { index: '01', title: '提交材料', text: '选择组织或平台范围，上传证书原件与履历材料，保存草稿后再提交。' },
  { index: '02', title: '等待审核', text: '组织认证由该组织认证员审核；平台认证由平台审核员独立审核，不能自审。' },
  { index: '03', title: '结果与申诉', text: '批准后可继续履职；驳回或撤销可提交申诉，由非原审核人独立复核。' },
] as const

function focusIn(target: HTMLElement | null) {
  void nextTick(() => target?.querySelector<HTMLElement>('h2')?.focus())
}
async function openDetail(item: CertificationSummary) {
  mode.value = 'detail'
  c.action.reset()
  await c.open(item)
  focusIn(detailArea.value)
}
function openCreate(scope: 'organization' | 'platform') {
  mode.value = 'create'
  createScope.value = scope
  formKey.value++
  c.action.reset()
  c.close()
  focusIn(formArea.value)
}
async function openEdit() {
  if (!c.selectedRecord.value) return
  mode.value = 'edit'
  c.action.reset()
  await nextTick()
  focusIn(formArea.value)
}
function cancelForm() {
  mode.value = 'detail'
  focusIn(c.selectedRecord.value ? detailArea.value : null)
}
function submitCurrent() {
  if (c.selectedRecord.value) void c.submit(c.selectedRecord.value)
}
async function save(payload: { body: CreateCertification | UpdateCertification; mode: 'create' | 'update' }) {
  let ok = false
  if (payload.mode === 'create') ok = await c.createDraft(payload.body as CreateCertification)
  else if (c.selectedRecord.value) ok = await c.updateDraft(c.selectedRecord.value, payload.body as UpdateCertification)
  if (ok) { mode.value = 'detail'; focusIn(detailArea.value) }
}
function openAppeal() {
  if (!c.selectedRecord.value) return
  appealRecord.value = c.selectedRecord.value
  showAppeal.value = true
}
async function confirmAppeal(body: { reason: string; evidenceMediaIds: string[] }) {
  if (!appealRecord.value) return
  if (await c.appeal(appealRecord.value, body)) { showAppeal.value = false; appealRecord.value = null }
}
function closeAppeal(visible: boolean) { if (!visible && !c.action.busy.value) { showAppeal.value = false; appealRecord.value = null } }
</script>

<template>
  <NavigationShell>
    <div class="mx-auto grid max-w-[1080px] gap-8">
      <UiPageBanner title="认证与资质" title-id="certifications-title" tone="available" status="可使用"
        description="在这里申请组织认证与平台认证，补交材料、查看历史或对驳回与撤销结果提交申诉。认证级别只作为标签保存，不自动授予角色。" />
      <CertificationsSignIn v-if="status !== 'authenticated'" :status="status" @retry="retry" />
      <UiLoadingRegion v-else-if="c.loading.value" :loading="true" label="读取认证记录" :lines="4" @retry="c.load()" />
      <div v-else-if="c.loadError.value" class="grid max-w-[560px] gap-3">
        <n-alert type="error" :show-icon="false" role="alert">{{ c.loadError.value }}</n-alert>
        <div><n-button type="primary" @click="c.load()">重新读取</n-button></div>
      </div>
      <template v-else>
        <section aria-labelledby="flow-title" class="grid gap-5 border-0 border-t border-solid border-ink pt-5 compact:grid-cols-3">
          <h2 id="flow-title" class="sr-only">认证流程</h2>
          <div v-for="step in flow" :key="step.index" class="grid gap-1">
            <span class="font-mono text-[13px] text-body">{{ step.index }}</span>
            <h3 class="m-0 text-base font-semibold text-ink">{{ step.title }}</h3>
            <p class="m-0 max-w-[38ch] text-sm leading-relaxed text-body">{{ step.text }}</p>
          </div>
        </section>

        <section aria-labelledby="mine-title" class="grid gap-3">
          <div class="flex flex-wrap items-baseline justify-between gap-3">
            <div class="flex items-baseline gap-2">
              <h2 id="mine-title" class="m-0 text-xl text-ink">我的认证</h2>
              <span v-if="c.items.value.length" class="font-mono text-[13px] text-body" :aria-label="`共 ${c.items.value.length} 条`">{{ c.items.value.length }}</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <n-button type="primary" :disabled="!c.activeOrganizations.value.length" @click="openCreate('organization')">申请组织认证</n-button>
              <n-button secondary :disabled="!c.platformEligible.value || platformTaken" @click="openCreate('platform')">申请平台认证</n-button>
            </div>
          </div>
          <p v-if="!c.activeOrganizations.value.length" class="m-0 text-[13px] leading-relaxed text-body">
            你还没有可申请认证的运行中组织。<RouterLink to="/organizations" class="font-medium text-accent-hover underline underline-offset-2">先加入或创建组织</RouterLink>。
          </p>
          <p v-else-if="!c.platformEligible.value" class="m-0 text-[13px] leading-relaxed text-body">平台认证需要先持有当前有效的组织认证；组织认证批准后可回来申请。</p>
          <p v-if="c.stale.value" role="status" class="m-0 border-0 border-l border-solid border-ink py-0.5 pl-3 text-[13px] leading-relaxed text-body">{{ c.stale.value }}</p>
          <CertificationList v-if="c.items.value.length" :items="c.items.value" :org-names="c.orgNames.value" :selected-id="c.selectedId.value" @select="openDetail" />
          <div v-else class="grid max-w-[560px] gap-3 border-0 border-t border-solid border-line pt-5">
            <p class="m-0 text-sm leading-relaxed text-body">还没有认证记录。先保存草稿并上传材料，再提交审核；同一范围只保留一条当前记录。</p>
          </div>
          <CertificationPager :page="c.page.value" :page-count="c.pageCount.value" :busy="c.mine.loading.value" @go="c.go" />
        </section>

        <div ref="formArea" v-if="mode === 'create' || mode === 'edit'" tabindex="-1" class="focus:outline-hidden">
          <CertificationForm :key="`${mode}-${c.selectedId.value ?? formKey}`" :initial="mode === 'edit' ? c.selectedRecord.value : null"
            :organizations="c.activeOrganizations.value" :taken-organization-ids="takenOrganizationIds"
            :platform-taken="platformTaken" :platform-eligible="c.platformEligible.value" :editing="mode === 'edit'"
            :busy="c.action.busy.value" :error="c.action.error.value" :default-scope="createScope"
            :default-organization-id="routeOrganizationId" @save="save" @cancel="cancelForm" />
        </div>

        <div ref="detailArea" v-else-if="c.selectedRecord.value" tabindex="-1" class="focus:outline-hidden">
          <CertificationDetail :record="c.selectedRecord.value" :org-names="c.orgNames.value" :history-items="c.historyItems.value"
            :appeal-items="c.appealItems.value" :history-loading="c.history.loading.value" :history-error="c.history.error.value"
            :appeals-loading="c.appeals.loading.value" :appeals-error="c.appeals.error.value"
            :busy="c.action.busy.value" :error="c.action.error.value" :stale="c.stale.value"
            @edit="openEdit" @submit="submitCurrent" @appeal="openAppeal" @close="c.close()"
            @retry-history="c.history.load()" @retry-appeals="c.appeals.load()" />
        </div>
      </template>
    </div>
    <CertificationAppealDialog :show="showAppeal" :record="appealRecord" :upload-options="appealUploadOptions"
      :busy="c.action.busy.value" :error="c.action.error.value" @update:show="closeAppeal" @confirm="confirmAppeal" />
  </NavigationShell>
</template>
