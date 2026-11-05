<script setup lang="ts">
import { NAlert, NButton, NInput, NSelect } from 'naive-ui'
import { Search, UserPlus } from '@lucide/vue'
import type { Candidate } from '@refs-tools/contracts/organization-access'
import UiSubmitHint from '../../../components/ui/UiSubmitHint.vue'
import { relationLabels } from '../organizations.presentation'

/**
 * 邀请候选人：按昵称或完整邮箱检索。结果只显示昵称和 ID 尾号（区分同名），不显示邮箱，
 * 输入完整邮箱时也只精确匹配一个账号，避免成为邮箱探测入口。
 */
defineProps<{ candidates: readonly Candidate[]; searched: boolean; searching: boolean; searchError: string; busy: boolean; error: string }>()
const keyword = defineModel<string>('keyword', { required: true })
const validDays = defineModel<number>('validDays', { required: true })
defineEmits<{ search: []; invite: [candidate: Candidate] }>()
const dayOptions = [1, 3, 7, 14, 30].map(value => ({ label: `${value} 天内有效`, value }))
</script>

<template>
  <section aria-labelledby="invite-title" class="grid gap-4 rounded-xl border border-solid border-line bg-soft p-4 compact:p-5">
    <h3 id="invite-title" class="m-0 flex items-center gap-2 text-base text-ink"><UserPlus class="size-4" :stroke-width="1.75" aria-hidden="true" />邀请成员</h3>
    <form class="grid gap-2 compact:grid-cols-[minmax(0,1fr)_auto]" role="search" @submit.prevent="$emit('search')">
      <label for="candidate-keyword" class="sr-only">按昵称或完整邮箱检索用户</label>
      <n-input id="candidate-keyword" v-model:value="keyword" placeholder="输入昵称，或对方的完整邮箱（至少 2 个字符）" clearable :input-props="{ autocomplete: 'off' }" />
      <n-button type="primary" attr-type="submit" :loading="searching" :disabled="keyword.trim().length < 2"><template #icon><Search class="size-4" aria-hidden="true" /></template>检索</n-button>
    </form>
    <n-alert v-if="searchError" type="error" :show-icon="false" role="alert">{{ searchError }}</n-alert>
    <ul v-if="candidates.length" class="m-0 grid list-none gap-2 p-0">
      <li v-for="candidate in candidates" :key="candidate.userId" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-solid border-line bg-surface p-3">
        <span class="grid min-w-0 gap-0.5">
          <span class="text-sm font-semibold text-ink wrap-anywhere">{{ candidate.displayName }}</span>
          <span class="text-xs text-body">尾号 {{ candidate.tag }}</span>
        </span>
        <span v-if="candidate.relation !== 'none'" class="rounded-full border border-solid border-line bg-soft px-3 py-1 text-xs text-ink">{{ relationLabels[candidate.relation] }}</span>
        <n-button v-else type="primary" size="small" :disabled="busy" :aria-label="`邀请${candidate.displayName}（尾号${candidate.tag}）`" @click="$emit('invite', candidate)">发出邀请</n-button>
      </li>
    </ul>
    <p v-else-if="searched && !searching && !searchError" role="status" class="m-0 text-sm text-body">没有匹配的账号。对方需账号有效且邮箱已验证；用邮箱检索时须输入完整邮箱。</p>
    <div class="flex flex-wrap items-center gap-3"><label for="valid-days" class="text-sm text-ink">邀请有效期</label>
      <n-select id="valid-days" v-model:value="validDays" :options="dayOptions" class="max-w-[160px]" :consistent-menu-width="false" /></div>
    <n-alert v-if="error" type="error" :show-icon="false" role="alert">{{ error }}</n-alert>
    <UiSubmitHint :busy="busy" />
    <p class="m-0 text-[13px] leading-relaxed text-body">邀请不含角色，也不会发送邮件；对方需要在「我的组织」里查看并接受。</p>
  </section>
</template>
