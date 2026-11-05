<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { NAlert, NButton, NInput } from 'naive-ui'
import { KeyRound } from '@lucide/vue'
import UiSubmitHint from '../../../components/ui/UiSubmitHint.vue'
import { linkButton } from '../organizations.presentation'

/**
 * 成员码兑换。成员码是凭据：输入框不开启自动填充，不回显到页面其他位置；
 * 兑换成功后清空输入并给出进入组织的入口，失败时保留输入以便核对。
 */
defineProps<{ busy: boolean; error: string; fieldError: string; joined: string | null }>()
const token = defineModel<string>('token', { required: true })
defineEmits<{ submit: [] }>()
</script>

<template>
  <section id="code" aria-labelledby="code-title" class="grid gap-4 border-0 border-l border-solid border-ink pl-4 compact:p-6">
    <header class="flex items-center gap-3">
      <KeyRound class="size-5" :stroke-width="1.75" aria-hidden="true" />
      <h2 id="code-title" class="m-0 text-lg text-ink">用成员码加入</h2>
    </header>
    <form class="grid gap-3 compact:grid-cols-[minmax(0,1fr)_auto] compact:items-start" @submit.prevent="$emit('submit')">
      <div class="grid gap-2">
        <label for="join-token" class="text-sm font-medium text-ink">成员码</label>
        <n-input id="join-token" v-model:value="token" placeholder="rj_…" :status="fieldError ? 'error' : 'success'" :disabled="busy"
          :input-props="{ autocomplete: 'off', spellcheck: false, autocapitalize: 'off', 'aria-invalid': !!fieldError, 'aria-describedby': fieldError ? 'join-token-error' : undefined }" />
        <p v-if="fieldError" id="join-token-error" role="alert" class="m-0 text-[13px] text-danger">{{ fieldError }}</p>
      </div>
      <n-button type="primary" attr-type="submit" :loading="busy" :disabled="busy || !token.trim()" class="compact:mt-[30px]">加入组织</n-button>
    </form>
    <n-alert v-if="error" type="error" :show-icon="false" role="alert">{{ error }}</n-alert>
    <UiSubmitHint :busy="busy" />
    <p v-if="joined" role="status" class="m-0 flex flex-wrap items-center gap-3 border-0 border-l border-solid border-ink py-0.5 pl-3 text-sm text-ink">
      已加入组织。<RouterLink :to="`/organizations/${joined}`" :class="linkButton.secondary">进入组织</RouterLink>
    </p>
    <p class="m-0 text-[13px] leading-relaxed text-ink">成员码仅用于加入，不会授予管理权限。已撤销、过期或用尽的成员码都无法使用。</p>
  </section>
</template>
