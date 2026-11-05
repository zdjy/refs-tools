<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NAlert, NButton } from 'naive-ui'
import type { Membership } from '@refs-tools/contracts/organization-members'
import UiLoadingRegion from '../../../components/ui/UiLoadingRegion.vue'
import { useUiFeedback } from '../../../components/ui/useUiFeedback'
import { formatDate, memberStatusLabels } from '../organizations.presentation'
import { useConfirmReason } from '../useConfirmReason'
import { useMemberManagement } from '../useMemberManagement'
import PagerBar from './PagerBar.vue'
import ReasonDialog from './ReasonDialog.vue'

const props = defineProps<{ organizationId: string; ownerUserId?: string }>()
const members = useMemberManagement(ref(props.organizationId))
const confirm = useConfirmReason<{ member: Membership; decision: 'approve' | 'reject' | 'remove' }>()
useUiFeedback(members.action.done)
onMounted(() => { void members.load() })

const labels = { approve: { title: '批准加入申请', confirm: '批准加入', text: '批准后申请人成为正式成员，但不会获得任何管理角色。' },
  reject: { title: '驳回加入申请', confirm: '驳回申请', text: '驳回后申请人需要重新申请才能加入。' },
  remove: { title: '移除成员', confirm: '移除成员', text: '移除后会立即撤销该成员在本组织及其赛事中的全部角色；重新加入不会恢复这些角色。' } } as const

async function submit() {
  const target = confirm.visible.value ? confirm.target.value : null, reason = confirm.take()
  if (!target || !reason) return
  if (await members.decide(target.member, target.decision, reason)) confirm.close()
}
</script>

<template>
  <section aria-labelledby="members-title" class="grid gap-4">
    <h2 id="members-title" class="m-0 text-lg text-ink">成员与入会申请</h2>
    <p v-if="members.stale.value" role="status" class="m-0 border-0 border-l border-solid border-ink py-0.5 pl-3 text-[13px] leading-relaxed">
      {{ members.stale.value }}<n-button text type="primary" class="ml-2" @click="members.load()">重新读取</n-button>
    </p>
    <n-alert v-if="members.action.error.value && !confirm.visible.value" type="error" :show-icon="false" role="alert">{{ members.action.error.value }}</n-alert>
    <UiLoadingRegion v-if="members.list.loading.value && !members.list.data.value" :loading="true" label="读取成员名单" :lines="4" @retry="members.load()" />
    <div v-else-if="members.list.error.value" class="grid gap-3">
      <n-alert type="error" :show-icon="false" role="alert">{{ members.list.error.value }}</n-alert>
      <div><n-button type="primary" @click="members.load()">重新读取</n-button></div>
    </div>
    <template v-else-if="members.list.data.value">
      <ul class="m-0 grid list-none gap-0 overflow-hidden rounded-xl border border-solid border-line p-0">
        <li v-for="member in members.items.value" :key="member.id" class="grid gap-2 border-0 border-b border-solid border-line p-4 last:border-b-0 compact:grid-cols-[minmax(0,1fr)_auto] compact:items-center">
          <div class="grid min-w-0 gap-0.5">
            <span class="text-base font-semibold text-ink wrap-anywhere">{{ member.displayName }}<span v-if="member.userId === ownerUserId" class="ml-2 text-xs font-normal text-body">负责人</span></span>
            <span class="text-[13px] text-body">{{ memberStatusLabels[member.status] }} · {{ formatDate(member.createdAt) }}</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <template v-if="member.status === 'pending'">
              <n-button secondary :disabled="members.action.busy.value" :aria-label="`驳回${member.displayName}的申请`" @click="confirm.open({ member, decision: 'reject' })">驳回</n-button>
              <n-button type="primary" :disabled="members.action.busy.value" :aria-label="`批准${member.displayName}加入`" @click="confirm.open({ member, decision: 'approve' })">批准</n-button>
            </template>
            <n-button v-else-if="member.status === 'active' && member.userId !== ownerUserId" secondary :disabled="members.action.busy.value" :aria-label="`移除${member.displayName}`" @click="confirm.open({ member, decision: 'remove' })">移除</n-button>
          </div>
        </li>
      </ul>
      <p v-if="!members.items.value.length" class="m-0 text-sm text-body">还没有成员记录。</p>
      <PagerBar :page="members.page.value" :page-count="members.pageCount.value" :busy="members.list.loading.value" label="成员分页" @go="members.go" />
    </template>
    <ReasonDialog :show="confirm.visible.value" v-model:reason="confirm.reason.value" :title="confirm.target.value ? labels[confirm.target.value.decision].title : ''"
      :description="confirm.target.value ? `${confirm.target.value.member.displayName}：${labels[confirm.target.value.decision].text}` : ''"
      :confirm-label="confirm.target.value ? labels[confirm.target.value.decision].confirm : ''" :busy="members.action.busy.value"
      :error="members.action.error.value" :problem="confirm.problem.value" :danger="confirm.target.value?.decision !== 'approve'" @update:show="!$event && confirm.close()" @confirm="submit" />
  </section>
</template>
