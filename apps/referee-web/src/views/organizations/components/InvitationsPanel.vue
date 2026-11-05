<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NAlert, NButton } from 'naive-ui'
import type { OrganizationInvitation } from '@refs-tools/contracts/organization-members'
import UiLoadingRegion from '../../../components/ui/UiLoadingRegion.vue'
import { useUiFeedback } from '../../../components/ui/useUiFeedback'
import { formatDate, invitationStatusLabels } from '../organizations.presentation'
import { useConfirmReason } from '../useConfirmReason'
import { useInvitationManagement } from '../useMemberManagement'
import InvitePeople from './InvitePeople.vue'
import PagerBar from './PagerBar.vue'
import ReasonDialog from './ReasonDialog.vue'

const props = defineProps<{ organizationId: string }>()
const inv = useInvitationManagement(ref(props.organizationId))
const confirm = useConfirmReason<OrganizationInvitation>()
const searched = ref(false)
useUiFeedback(inv.invite.done)
useUiFeedback(inv.revoke.done)
onMounted(() => { void inv.load() })

async function search() { searched.value = true; await inv.findCandidates() }
async function submit() {
  const target = confirm.visible.value ? confirm.target.value : null, reason = confirm.take()
  if (target && reason && await inv.revokeInvitation(target, reason)) confirm.close()
}
</script>

<template>
  <section aria-labelledby="invitations-title" class="grid gap-5">
    <h2 id="invitations-title" class="m-0 text-lg text-ink">邀请</h2>
    <InvitePeople v-model:keyword="inv.keyword.value" v-model:valid-days="inv.validDays.value" :candidates="inv.candidates.value" :searched="searched"
      :searching="inv.search.loading.value" :search-error="inv.search.error.value" :busy="inv.invite.busy.value" :error="inv.invite.error.value"
      @search="search" @invite="inv.sendInvitation" />
    <p v-if="inv.stale.value" role="status" class="m-0 rounded-xl border border-solid border-line bg-soft px-4 py-3 text-[13px] leading-relaxed">
      {{ inv.stale.value }}<n-button text type="primary" class="ml-2" @click="inv.load()">重新读取</n-button>
    </p>
    <UiLoadingRegion v-if="inv.list.loading.value && !inv.list.data.value" :loading="true" label="读取邀请" :lines="3" @retry="inv.load()" />
    <div v-else-if="inv.list.error.value" class="grid gap-3">
      <n-alert type="error" :show-icon="false" role="alert">{{ inv.list.error.value }}</n-alert>
      <div><n-button type="primary" @click="inv.load()">重新读取</n-button></div>
    </div>
    <template v-else-if="inv.list.data.value">
      <h3 class="m-0 text-base text-ink">已发出的邀请</h3>
      <ul v-if="inv.items.value.length" class="m-0 grid list-none gap-0 overflow-hidden rounded-xl border border-solid border-line p-0">
        <li v-for="item in inv.items.value" :key="item.id" class="grid gap-2 border-0 border-b border-solid border-line p-4 last:border-b-0 compact:grid-cols-[minmax(0,1fr)_auto] compact:items-center">
          <div class="grid min-w-0 gap-0.5">
            <span class="text-base font-semibold text-ink wrap-anywhere">{{ item.displayName }}</span>
            <span class="text-[13px] text-body">{{ invitationStatusLabels[item.status] }} · {{ formatDate(item.expiresAt) }} 到期</span>
          </div>
          <n-button v-if="item.status === 'pending'" secondary :disabled="inv.revoke.busy.value" :aria-label="`撤销对${item.displayName}的邀请`" @click="confirm.open(item)">撤销</n-button>
        </li>
      </ul>
      <p v-else class="m-0 text-sm text-body">还没有发出过邀请。</p>
      <PagerBar :page="inv.page.value" :page-count="inv.pageCount.value" :busy="inv.list.loading.value" label="邀请分页" @go="inv.go" />
    </template>
    <ReasonDialog :show="confirm.visible.value" v-model:reason="confirm.reason.value" title="撤销邀请" confirm-label="撤销邀请" danger
      :description="confirm.target.value ? `撤销后「${confirm.target.value.displayName}」将无法再接受这次邀请。` : ''"
      :busy="inv.revoke.busy.value" :error="inv.revoke.error.value" :problem="confirm.problem.value" @update:show="!$event && confirm.close()" @confirm="submit" />
  </section>
</template>
