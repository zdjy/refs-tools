<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { NAlert, NButton, NInput } from 'naive-ui'
import { ArrowLeft, Search } from '@lucide/vue'
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import UiLoadingRegion from '../../components/ui/UiLoadingRegion.vue'
import UiSubmitHint from '../../components/ui/UiSubmitHint.vue'
import { useUiFeedback } from '../../components/ui/useUiFeedback'
import DirectoryList from './components/DirectoryList.vue'
import JoinByCode from './components/JoinByCode.vue'
import OrganizationsSignIn from './components/OrganizationsSignIn.vue'
import { useAuthGate } from '../../application/useAuthGate'
import { useOrganizationDirectory } from './useOrganizationDirectory'

const dir = useOrganizationDirectory()
const { status, retry } = useAuthGate(() => dir.directory.load())
useUiFeedback(dir.join.done)
useUiFeedback(dir.redeem.done)
</script>

<template>
  <NavigationShell>
    <div class="mx-auto grid max-w-[900px] gap-6">
      <RouterLink to="/organizations" class="inline-flex min-h-11 w-fit items-center gap-2 text-sm text-body no-underline hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        <ArrowLeft class="size-4" :stroke-width="1.75" aria-hidden="true" />我的组织
      </RouterLink>
      <header class="grid gap-2">
        <h1 class="m-0 text-[28px] leading-tight font-bold tracking-tight text-ink compact:text-[36px]">加入新组织</h1>
        <p class="m-0 max-w-[60ch] text-sm leading-relaxed text-body">有成员码就直接兑换；没有的话，在目录里找到组织并提交加入申请，由组织管理者审核。</p>
      </header>
      <OrganizationsSignIn v-if="status !== 'authenticated'" :status="status" @retry="retry" />
      <template v-else>
        <JoinByCode v-model:token="dir.token.value" :busy="dir.redeem.busy.value" :error="dir.redeem.error.value"
          :field-error="dir.tokenError.value" :joined="dir.joined.value" @submit="dir.redeemToken" />
        <section aria-labelledby="directory-title" class="grid gap-4">
          <h2 id="directory-title" class="m-0 text-xl text-ink">组织目录</h2>
          <form class="flex gap-2" role="search" @submit.prevent="dir.search()">
            <label for="directory-keyword" class="sr-only">按名称或地区检索</label>
            <n-input id="directory-keyword" v-model:value="dir.keyword.value" placeholder="按名称或地区检索" clearable :input-props="{ type: 'search', enterkeyhint: 'search' }" />
            <n-button type="primary" attr-type="submit" :loading="dir.directory.loading.value" aria-label="检索"><template #icon><Search class="size-4" aria-hidden="true" /></template></n-button>
          </form>
          <n-alert v-if="dir.join.error.value" type="error" :show-icon="false" role="alert">{{ dir.join.error.value }}</n-alert>
          <UiSubmitHint :busy="dir.join.busy.value" />
          <UiLoadingRegion v-if="dir.directory.loading.value && !dir.directory.data.value" :loading="true" label="读取组织目录" :lines="4" @retry="dir.search()" />
          <div v-else-if="dir.directory.error.value" class="grid max-w-[560px] gap-3">
            <n-alert type="error" :show-icon="false" role="alert">{{ dir.directory.error.value }}</n-alert>
            <div><n-button type="primary" @click="dir.directory.load()">重新读取</n-button></div>
          </div>
          <template v-else-if="dir.directory.data.value">
            <DirectoryList v-if="dir.items.value.length" :items="dir.items.value" :busy="dir.join.busy.value" @join="dir.requestJoin" />
            <p v-else class="m-0 border-0 border-t border-solid border-ink pt-6 text-sm leading-relaxed text-body">
              {{ dir.keyword.value.trim() ? '没有找到匹配的组织，换个关键词试试。' : '目录里暂时还没有已开通的组织。你可以申请创建第一个。' }}
            </p>
            <nav v-if="dir.pageCount.value > 1" aria-label="目录分页" class="flex items-center justify-between gap-3">
              <n-button secondary :disabled="dir.page.value <= 1 || dir.directory.loading.value" @click="dir.go(dir.page.value - 1)">上一页</n-button>
              <span class="text-sm tabular-nums text-body" role="status">第 {{ dir.page.value }} / {{ dir.pageCount.value }} 页</span>
              <n-button secondary :disabled="dir.page.value >= dir.pageCount.value || dir.directory.loading.value" @click="dir.go(dir.page.value + 1)">下一页</n-button>
            </nav>
          </template>
        </section>
      </template>
    </div>
  </NavigationShell>
</template>
