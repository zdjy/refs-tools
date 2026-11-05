<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { NAlert, NButton, NInputNumber } from 'naive-ui'
import type { JoinCode } from '@refs-tools/contracts/organization-access'
import UiLoadingRegion from '../../../components/ui/UiLoadingRegion.vue'
import UiSubmitHint from '../../../components/ui/UiSubmitHint.vue'
import { useUiFeedback } from '../../../components/ui/useUiFeedback'
import { formatDate, joinCodeStatusLabels } from '../organizations.presentation'
import { useJoinCodes } from '../useJoinCodes'
import JoinCodeReveal from './JoinCodeReveal.vue'

const props = defineProps<{ organizationId: string }>()
const id = ref(props.organizationId)
const codes = useJoinCodes(id)
useUiFeedback(codes.create.done)
useUiFeedback(codes.revoke.done)
onMounted(() => { void codes.load() })
// 明文只属于当前组织的当前会话：切换组织或离开页面立即清除。
watch(() => props.organizationId, (next) => { codes.clear(); id.value = next; void codes.load() })
onBeforeUnmount(() => codes.clear())
const lock = (code: JoinCode) => code.status !== 'active' || codes.revoke.busy.value
</script>

<template>
  <section aria-labelledby="codes-title" class="grid gap-5">
    <h2 id="codes-title" class="m-0 text-lg text-ink">成员码</h2>
    <p class="m-0 max-w-[64ch] text-sm leading-relaxed text-body">把成员码发给想加入的人，对方兑换后立即成为普通成员。成员码只用于加入，不授予管理权限。</p>
    <JoinCodeReveal v-if="codes.revealed.value" :token="codes.revealed.value.token" :hint="codes.revealed.value.code.hint" :notice="codes.copyNotice.value" @copy="codes.copy()" @dismiss="codes.dismiss()" />
    <form class="grid gap-4 rounded-xl border border-solid border-line bg-soft p-4 compact:grid-cols-[auto_auto_auto] compact:items-end compact:justify-start" @submit.prevent="codes.generate()">
      <div class="grid gap-2"><label for="code-days" class="text-sm font-medium text-ink">有效天数（1-30）</label>
        <n-input-number id="code-days" v-model:value="codes.validDays.value" :min="1" :max="30" :precision="0" :show-button="false" :input-props="{ inputmode: 'numeric' }" /></div>
      <div class="grid gap-2"><label for="code-uses" class="text-sm font-medium text-ink">可使用次数（1-100）</label>
        <n-input-number id="code-uses" v-model:value="codes.maxUses.value" :min="1" :max="100" :precision="0" :show-button="false" :input-props="{ inputmode: 'numeric' }" /></div>
      <n-button type="primary" attr-type="submit" :loading="codes.create.busy.value" :disabled="codes.create.busy.value">生成成员码</n-button>
    </form>
    <n-alert v-if="codes.create.error.value" type="error" :show-icon="false" role="alert">{{ codes.create.error.value }}</n-alert>
    <n-alert v-if="codes.revoke.error.value" type="error" :show-icon="false" role="alert">{{ codes.revoke.error.value }}</n-alert>
    <UiSubmitHint :busy="codes.create.busy.value || codes.revoke.busy.value" />
    <p v-if="codes.stale.value" role="status" class="m-0 rounded-xl border border-solid border-line bg-soft px-4 py-3 text-[13px] leading-relaxed">
      {{ codes.stale.value }}<n-button text type="primary" class="ml-2" @click="codes.load()">重新读取</n-button>
    </p>
    <UiLoadingRegion v-if="codes.list.loading.value && !codes.list.data.value" :loading="true" label="读取成员码" :lines="3" @retry="codes.load()" />
    <div v-else-if="codes.list.error.value" class="grid gap-3">
      <n-alert type="error" :show-icon="false" role="alert">{{ codes.list.error.value }}</n-alert>
      <div><n-button type="primary" @click="codes.load()">重新读取</n-button></div>
    </div>
    <ul v-else-if="codes.items.value.length" class="m-0 grid list-none gap-0 overflow-hidden rounded-xl border border-solid border-line p-0">
      <li v-for="code in codes.items.value" :key="code.id" class="grid gap-2 border-0 border-b border-solid border-line p-4 last:border-b-0 compact:grid-cols-[minmax(0,1fr)_auto] compact:items-center">
        <div class="grid gap-0.5">
          <span class="text-base font-semibold text-ink">以 <span class="font-mono">{{ code.hint }}</span> 结尾 · {{ joinCodeStatusLabels[code.status] }}</span>
          <span class="text-[13px] tabular-nums text-body">已使用 {{ code.uses }} / {{ code.maxUses }} 次 · {{ formatDate(code.expiresAt) }} 到期</span>
        </div>
        <n-button v-if="code.status === 'active'" secondary :disabled="lock(code)" :aria-label="`撤销以${code.hint}结尾的成员码`" @click="codes.revokeCode(code)">撤销</n-button>
      </li>
    </ul>
    <p v-else-if="codes.list.data.value" class="m-0 text-sm text-body">还没有生成过成员码。</p>
  </section>
</template>
