<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NAlert, NButton, NInput } from 'naive-ui'
import { Search } from '@lucide/vue'
import type { Membership } from '@refs-tools/contracts/organization-members'
import UiLoadingRegion from '../../../components/ui/UiLoadingRegion.vue'
import { useUiFeedback } from '../../../components/ui/useUiFeedback'
import type { MemberDecision } from '../organizations.presentation'
import { useConfirmReason } from '../useConfirmReason'
import { useMemberContact } from '../useMemberContact'
import { useMemberManagement } from '../useMemberManagement'
import MemberDetailDialog from './MemberDetailDialog.vue'
import MemberRoster from './MemberRoster.vue'
import PagerBar from './PagerBar.vue'
import ReasonDialog from '../../../components/ui/UiReasonDialog.vue'

const props = defineProps<{ organizationId: string; ownerUserId?: string }>()
const members = useMemberManagement(ref(props.organizationId))
const detail = useMemberContact(ref(props.organizationId))
const confirm = useConfirmReason<{ member: Membership; decision: MemberDecision }>()
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
    <h2 id="members-title" class="m-0 text-lg text-ink">{{ members.canManage.value ? '成员与入会申请' : '成员名单' }}</h2>
    <form role="search" class="grid gap-2 compact:grid-cols-[minmax(0,1fr)_auto]" @submit.prevent="members.search()">
      <label for="member-keyword" class="sr-only">按成员昵称搜索，留空显示全部</label>
      <n-input id="member-keyword" v-model:value="members.keyword.value" placeholder="输入昵称搜索成员，留空显示全部" clearable
        :input-props="{ autocomplete: 'off', 'aria-controls': 'member-list' }" />
      <n-button type="primary" attr-type="submit" :loading="members.list.loading.value"><template #icon><Search class="size-4" aria-hidden="true" /></template>搜索</n-button>
    </form>
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
      <p role="status" class="m-0 text-[13px] text-body">
        {{ members.filtering.value ? `匹配 ${members.total.value} 位成员` : `共 ${members.total.value} 位成员` }}
      </p>
      <MemberRoster v-if="members.items.value.length" :items="members.items.value" :owner-user-id="ownerUserId ?? ''"
        :can-manage="members.canManage.value" :busy="members.list.loading.value || members.action.busy.value" :aria-busy="members.list.loading.value || members.action.busy.value"
        @open="detail.open" @decide="(member, decision) => confirm.open({ member, decision })" />
      <p v-else class="m-0 border-0 border-y border-solid border-line px-4 py-6 text-sm leading-relaxed text-body">
        {{ members.filtering.value ? '没有匹配的成员。换一个昵称，或清空关键词查看全部。' : '还没有成员记录。' }}
      </p>
      <PagerBar :page="members.page.value" :page-count="members.pageCount.value" :busy="members.list.loading.value" label="成员分页" @go="members.go" />
    </template>
    <MemberDetailDialog :show="detail.visible.value" :member="detail.target.value" :contact="detail.data.value"
      :avatar-url="detail.avatarUrl.value" :loading="detail.loading.value" :error="detail.error.value"
      @update:show="!$event && detail.close()" @retry="detail.retry" />
    <ReasonDialog :show="confirm.visible.value" v-model:reason="confirm.reason.value" :title="confirm.target.value ? labels[confirm.target.value.decision].title : ''"
      :description="confirm.target.value ? `${confirm.target.value.member.displayName}：${labels[confirm.target.value.decision].text}` : ''"
      :confirm-label="confirm.target.value ? labels[confirm.target.value.decision].confirm : ''" :busy="members.action.busy.value"
      :error="members.action.error.value" :problem="confirm.problem.value" :danger="confirm.target.value?.decision !== 'approve'" @update:show="!$event && confirm.close()" @confirm="submit" />
  </section>
</template>
