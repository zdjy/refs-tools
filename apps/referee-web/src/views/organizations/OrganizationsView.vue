<script setup lang="ts">
import { NAlert, NButton } from 'naive-ui'
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import UiLoadingRegion from '../../components/ui/UiLoadingRegion.vue'
import UiPageBanner from '../../components/ui/UiPageBanner.vue'
import { useUiFeedback } from '../../components/ui/useUiFeedback'
import InvitationInbox from './components/InvitationInbox.vue'
import OrganizationEntries from './components/OrganizationEntries.vue'
import OrganizationRoster from './components/OrganizationRoster.vue'
import OrganizationsSignIn from './components/OrganizationsSignIn.vue'
import { useAuthGate } from './useAuthGate'
import { useMyOrganizations } from './useMyOrganizations'

const { items, invitations, loading, loadError, stale, action, load, respond } = useMyOrganizations()
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
            <h2 id="roster-title" class="m-0 text-xl text-ink">已加入与申请中</h2>
            <OrganizationRoster v-if="items.length" :items="items" />
            <p v-else class="m-0 border-0 border-t border-solid border-ink pt-6 text-sm leading-relaxed text-body">
              你还没有加入任何组织。从下面选择一种方式开始。
            </p>
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
