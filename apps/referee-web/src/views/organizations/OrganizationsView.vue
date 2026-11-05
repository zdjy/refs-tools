<script setup lang="ts">
import { NAlert, NButton } from 'naive-ui'
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import UiLoadingRegion from '../../components/ui/UiLoadingRegion.vue'
import UiPageBanner from '../../components/ui/UiPageBanner.vue'
import { useUiFeedback } from '../../components/ui/useUiFeedback'
import InvitationInbox from './components/InvitationInbox.vue'
import OrganizationEntries from './components/OrganizationEntries.vue'
import OrganizationRoster from './components/OrganizationRoster.vue'
import OrganizationRosterFilters from './components/OrganizationRosterFilters.vue'
import OrganizationsSignIn from './components/OrganizationsSignIn.vue'
import { useAuthGate } from './useAuthGate'
import { useMyOrganizations } from './useMyOrganizations'
import { useOrganizationRoster } from './useOrganizationRoster'

const { items, invitations, loading, loadError, stale, action, load, respond } = useMyOrganizations()
const { keyword, filter, counts, showTools, filtered, visible, hidden, nextCount, filtering, showMore, reset } = useOrganizationRoster(items)
const { status, retry } = useAuthGate(load)
useUiFeedback(action.done)
</script>

<template>
  <NavigationShell>
    <UiPageBanner title="我的组织" title-id="organizations-title" tone="available"
      description="加入或创建组织后，在这里查看成员身份、回应邀请，并进入你有权管理的组织。" />
    <div class="mt-8 grid gap-8">
      <OrganizationsSignIn v-if="status !== 'authenticated'" :status="status" @retry="retry" />
      <template v-else>
        <UiLoadingRegion v-if="loading" :loading="loading" label="读取我的组织" :lines="4" @retry="load()" />
        <div v-else-if="loadError" class="grid max-w-[560px] gap-3">
          <n-alert type="error" :show-icon="false" role="alert">{{ loadError }}</n-alert>
          <div><n-button type="primary" @click="load()">重新读取</n-button></div>
        </div>
        <template v-else>
          <p v-if="stale" role="status" class="m-0 border-0 border-l border-solid border-ink py-0.5 pl-3 text-[13px] leading-relaxed">
            {{ stale }}<n-button text type="primary" class="ml-2" @click="load()">重新读取</n-button>
          </p>
          <InvitationInbox :items="invitations" :busy="action.busy.value" :error="action.error.value" @respond="respond" />
          <section aria-labelledby="roster-title" class="grid gap-3">
            <div class="flex flex-wrap items-baseline gap-x-2">
              <h2 id="roster-title" class="m-0 text-xl text-ink">已加入与申请中</h2>
              <span v-if="items.length" class="font-mono text-[13px] text-body" :aria-label="`共 ${items.length} 个组织`">{{ items.length }}</span>
            </div>
            <!-- 组织较多时才提供检索与筛选：短列表直接看比先筛选更快。 -->
            <OrganizationRosterFilters v-if="showTools" v-model:keyword="keyword" v-model:filter="filter" :counts="counts" :matched="filtered.length" />
            <template v-if="visible.length">
              <OrganizationRoster :items="visible" />
              <div v-if="hidden" class="flex flex-wrap items-center justify-center gap-3 pt-1">
                <n-button secondary @click="showMore()">再显示 {{ nextCount }} 个</n-button>
                <span class="text-[13px] text-body">还有 {{ hidden }} 个未显示</span>
              </div>
            </template>
            <p v-else-if="!items.length" class="m-0 border-0 border-t border-solid border-ink pt-6 text-sm leading-relaxed text-body">
              你还没有加入任何组织。从下面选择一种方式开始。
            </p>
            <div v-else class="grid max-w-[560px] gap-3 border-0 border-t border-solid border-ink pt-6">
              <p class="m-0 text-sm leading-relaxed text-body">没有匹配的组织。换个关键词或状态，或重置筛选。</p>
              <div v-if="filtering"><n-button secondary @click="reset()">重置筛选</n-button></div>
            </div>
          </section>
          <section aria-labelledby="entries-title" class="grid gap-3">
            <h2 id="entries-title" class="m-0 text-xl text-ink">加入或创建</h2>
            <OrganizationEntries />
          </section>
        </template>
      </template>
    </div>
  </NavigationShell>
</template>
