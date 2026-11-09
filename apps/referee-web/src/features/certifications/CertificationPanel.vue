<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave, RouterLink } from 'vue-router'
import { NAlert, NButton } from 'naive-ui'
import type { CertificationScope } from '@refs-tools/contracts/certifications'
import UiLoadingRegion from '../../components/ui/UiLoadingRegion.vue'
import { useUiFeedback } from '../../components/ui/useUiFeedback'
import { useAuthGate } from '../../application/useAuthGate'
import CertificationAppealDialog from './components/CertificationAppealDialog.vue'
import CertificationDetail from './components/CertificationDetail.vue'
import CertificationForm from './components/CertificationForm.vue'
import CertificationList from './components/CertificationList.vue'
import CertificationsSignIn from './components/CertificationsSignIn.vue'
import { useCertificationPanel } from './useCertificationPanel'

const props = defineProps<{ scope: CertificationScope }>()
const { c, mode, formKey, formArea, detailArea, showAppeal, appealRecord, formProtection,
  appealUploadOptions, openDetail, openCreate, openEdit, cancelForm, save, openAppeal, confirmAppeal, closeAppeal, reload } = useCertificationPanel(props.scope)
const { status, retry } = useAuthGate(c.load)
const platform = props.scope.type === 'platform'
const organizations = computed(() => c.organizations.data.value?.filter(item => item.id === props.scope.organizationId) ?? [])
const canCreate = computed(() => !c.items.value.length && (platform ? c.platformEligible.value :
  c.activeOrganizations.value.some(item => item.id === props.scope.organizationId)))
const takenOrganizationIds = computed(() => c.items.value.flatMap(item => item.scope.organizationId ? [item.scope.organizationId] : []))
useUiFeedback(c.action.done)
onBeforeRouteLeave(() => !c.locked.value && !showAppeal.value)
function canLeave() {
  if (formProtection.value.locked || c.locked.value || showAppeal.value) return false
  return !formProtection.value.dirty || window.confirm('申请材料尚未保存，确认离开并放弃本次修改？')
}
defineExpose({ canLeave })
onBeforeUnmount(() => { c.mine.clear(); c.organizations.clear(); c.detail.clear(); c.history.clear(); c.appeals.clear() })
</script>

<template>
  <div class="grid min-w-0 gap-6">
    <CertificationsSignIn v-if="status !== 'authenticated'" :status="status" @retry="retry" />
    <UiLoadingRegion v-else-if="c.loading.value" :loading="true" label="读取认证记录" :lines="4" @retry="c.load()" />
    <div v-else-if="c.loadError.value" class="grid max-w-[560px] gap-3">
      <n-alert type="error" :show-icon="false" role="alert">{{ c.loadError.value }}</n-alert>
      <div><n-button type="primary" @click="c.load()">重新读取</n-button></div>
    </div>
    <template v-else>
      <section v-if="mode === 'detail'" aria-labelledby="mine-title" class="grid gap-3">
        <div class="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="mine-title" class="m-0 text-xl text-ink">{{ platform ? '我的平台认证' : '本组织认证' }}</h2>
          <n-button v-if="!c.items.value.length" type="primary" :disabled="!canCreate || c.locked.value" @click="openCreate">
            {{ platform ? '申请平台认证' : '申请组织认证' }}
          </n-button>
        </div>
        <p class="m-0 max-w-[64ch] text-sm leading-relaxed text-body">
          {{ platform ? '由平台审核员独立审核，通过后可跨组织使用。申请、补件、历史与申诉均在此办理。' : '认证仅在本组织内使用，由本组织认证员审核。你可以在此申请、补件、查看历史和提交申诉。' }}
        </p>
        <p v-if="!c.items.value.length && !canCreate" role="status" class="m-0 text-sm leading-relaxed text-body">
          <template v-if="platform">申请前需持有当前有效的组织认证，并保持该组织的正式成员身份。请到<RouterLink to="/organizations" class="inline-flex min-h-11 items-center font-medium text-accent-hover underline underline-offset-2">我的组织</RouterLink>办理组织认证。</template>
          <template v-else>组织尚未运行或你的正式成员关系已失效，暂时不能申请本组织认证。</template>
        </p>
        <p v-if="c.stale.value || c.mine.error.value || c.organizations.error.value" role="status" class="m-0 text-sm leading-relaxed text-body">
          {{ c.stale.value || c.mine.error.value || c.organizations.error.value }}<n-button secondary :disabled="c.locked.value" @click="reload">重新读取</n-button>
        </p>
        <CertificationList v-if="c.items.value.length" :items="c.items.value" :org-names="c.orgNames.value" :selected-id="c.selectedId.value" @select="openDetail" />
        <p v-else class="m-0 border-0 border-t border-solid border-line pt-5 text-sm leading-relaxed text-body">尚无{{ platform ? '平台' : '本组织' }}认证记录。申请时需填写证书信息、个人声明，并分别上传证书原件和履历材料；核对后可保存草稿或提交审核。</p>
      </section>
      <div v-if="mode === 'create' || mode === 'edit'" ref="formArea" tabindex="-1" class="min-w-0 focus:outline-hidden">
        <CertificationForm :key="mode === 'create' ? `create-${formKey}` : `edit-${c.selectedId.value}`"
          :initial="mode === 'edit' ? c.selectedRecord.value : null" :organizations="organizations" :taken-organization-ids="takenOrganizationIds"
          :platform-taken="platform && !!c.items.value.length" :platform-eligible="c.platformEligible.value" :editing="mode === 'edit'"
          :busy="c.locked.value" :error="c.action.error.value" :default-scope="scope.type" :default-organization-id="scope.organizationId" :fixed-scope="scope"
          @save="save" @cancel="cancelForm" @protection="formProtection = $event" />
      </div>
      <UiLoadingRegion v-if="mode === 'detail' && c.detail.loading.value && !c.selectedRecord.value" :loading="true" label="读取认证详情" :lines="4" />
      <div v-if="mode === 'detail' && c.detail.error.value && !c.selectedRecord.value" role="alert" class="grid gap-3">
        <p class="m-0 text-sm text-danger">{{ c.detail.error.value }}</p>
        <div><n-button @click="reload">重新读取详情</n-button></div>
      </div>
      <div v-if="mode === 'detail' && c.selectedRecord.value" ref="detailArea" tabindex="-1" class="min-w-0 focus:outline-hidden">
        <CertificationDetail :record="c.selectedRecord.value" :org-names="c.orgNames.value" :history-items="c.historyItems.value"
          :appeal-items="c.appealItems.value" :history-loading="c.history.loading.value" :history-error="c.history.error.value"
          :appeals-loading="c.appeals.loading.value" :appeals-error="c.appeals.error.value" :busy="c.locked.value || !!c.stale.value" :error="c.action.error.value" :stale="c.stale.value"
          @edit="openEdit" @submit="c.selectedRecord.value && c.submit(c.selectedRecord.value)" @appeal="openAppeal" @close="c.close()"
          @retry-history="c.history.load()" @retry-appeals="c.appeals.load()" />
      </div>
    </template>
    <CertificationAppealDialog :show="showAppeal" :record="appealRecord" :upload-options="appealUploadOptions"
      :busy="c.action.busy.value" :error="c.action.error.value" @update:show="closeAppeal" @confirm="confirmAppeal" />
  </div>
</template>
