<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { NAlert, NButton } from 'naive-ui'
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import UiLoadingRegion from '../../components/ui/UiLoadingRegion.vue'
import { useUiFeedback } from '../../components/ui/useUiFeedback'
import InvitationsPanel from './components/InvitationsPanel.vue'
import JoinCodesPanel from './components/JoinCodesPanel.vue'
import MembersPanel from './components/MembersPanel.vue'
import OrganizationsSignIn from './components/OrganizationsSignIn.vue'
import OverviewPanel from './components/OverviewPanel.vue'
import ReasonDialog from './components/ReasonDialog.vue'
import RolesPanel from './components/RolesPanel.vue'
import WorkspaceHeader from './components/WorkspaceHeader.vue'
import { linkButton } from './organizations.presentation'
import { useAuthGate } from './useAuthGate'
import { useConfirmReason } from './useConfirmReason'
import { useOrganizationWorkspace } from './useOrganizationWorkspace'
import { useWorkspaceTabs } from './useWorkspaceTabs'

const props = defineProps<{ organizationId: string }>()
const id = computed(() => props.organizationId)
const ws = useOrganizationWorkspace(id)
const { status, retry } = useAuthGate(ws.load)
const confirm = useConfirmReason<true>()
const router = useRouter()
const tablist = ref<HTMLElement | null>(null)
const { onKeydown } = useWorkspaceTabs(tablist, ws.tab)
useUiFeedback(ws.leave.done)
// 切换组织时回到概览并重新读取，旧组织的数据与确认状态都不保留。
watch(id, () => { ws.tab.value = 'overview'; confirm.close(); void ws.load() })
onBeforeUnmount(() => ws.mine.clear())

async function leave() {
  const reason = confirm.take()
  if (reason && await ws.leaveOrganization(reason)) { confirm.close(); await router.push('/organizations') }
}
</script>

<template>
  <NavigationShell>
    <div class="mx-auto grid max-w-[980px] gap-6">
      <OrganizationsSignIn v-if="status !== 'authenticated'" :status="status" @retry="retry" />
      <UiLoadingRegion v-else-if="ws.mine.loading.value && !ws.mine.data.value" :loading="true" label="读取组织" :lines="5" @retry="ws.load()" />
      <div v-else-if="ws.mine.error.value" class="grid max-w-[560px] gap-3">
        <n-alert type="error" :show-icon="false" role="alert">{{ ws.mine.error.value }}</n-alert>
        <div class="flex gap-2"><n-button type="primary" @click="ws.load()">重新读取</n-button><RouterLink to="/organizations" :class="linkButton.secondary">返回我的组织</RouterLink></div>
      </div>
      <section v-else-if="ws.notFound.value" class="grid max-w-[560px] gap-3 border-0 border-t border-solid border-ink pt-6">
        <h1 class="m-0 text-xl text-ink">没有找到这个组织</h1>
        <p class="m-0 text-sm leading-relaxed text-body">你可能不是它的成员，或成员关系已经结束。</p>
        <div><RouterLink to="/organizations" :class="linkButton.primary">返回我的组织</RouterLink></div>
      </section>
      <template v-else-if="ws.organization.value">
        <WorkspaceHeader :organization="ws.organization.value" />
        <!-- 手机端五个标签均分整行、不出现横向滚动条；窄到 320px 才退回局部横滑，滚动条本身不显示。 -->
        <div ref="tablist" role="tablist" aria-label="组织工作区"
          class="-mx-1 flex gap-2 overflow-x-auto overscroll-x-contain scroll-smooth px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" @keydown="onKeydown">
          <button v-for="item in ws.tabs.value" :id="`ws-tab-${item.id}`" :key="item.id" type="button" role="tab" :data-tab="item.id"
            :aria-selected="ws.tab.value === item.id" :aria-controls="`ws-panel-${item.id}`" :tabindex="ws.tab.value === item.id ? 0 : -1"
            class="inline-flex min-h-11 min-w-max flex-1 items-center justify-center rounded-full border-0 px-2 text-sm whitespace-nowrap transition-[background-color,color] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[.98] sm:flex-none sm:px-5"
            :class="ws.tab.value === item.id ? 'bg-ink font-semibold text-surface' : 'bg-soft text-body hover:bg-sand hover:text-ink'" @click="ws.tab.value = item.id">{{ item.label }}</button>
        </div>
        <div :id="`ws-panel-${ws.tab.value}`" role="tabpanel" :aria-labelledby="`ws-tab-${ws.tab.value}`" tabindex="0"
          class="min-w-0 border-0 border-t border-solid border-ink pt-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent compact:p-6">
          <OverviewPanel v-if="ws.tab.value === 'overview'" :organization="ws.organization.value" @leave="confirm.open(true)" />
          <MembersPanel v-else-if="ws.tab.value === 'members'" :key="`m-${id}`" :organization-id="id" :owner-user-id="ws.organization.value.ownerUserId" />
          <InvitationsPanel v-else-if="ws.tab.value === 'invitations'" :key="`i-${id}`" :organization-id="id" />
          <JoinCodesPanel v-else-if="ws.tab.value === 'codes'" :key="`c-${id}`" :organization-id="id" />
          <RolesPanel v-else :key="`r-${id}`" :organization-id="id" />
        </div>
      </template>
    </div>
    <ReasonDialog :show="confirm.visible.value" v-model:reason="confirm.reason.value" danger
      :title="ws.organization.value?.membership?.status === 'pending' ? '撤回加入申请' : '退出组织'"
      :description="ws.organization.value?.membership?.status === 'pending' ? '撤回后需要重新申请才能加入。' : '退出后将立即撤销你在该组织及其赛事中的全部角色，重新加入不会恢复。'"
      :confirm-label="ws.organization.value?.membership?.status === 'pending' ? '撤回申请' : '退出组织'"
      :busy="ws.leave.busy.value" :error="ws.leave.error.value" :problem="confirm.problem.value" @update:show="!$event && confirm.close()" @confirm="leave" />
  </NavigationShell>
</template>
