<script setup lang="ts">
import { computed, nextTick, ref, type InputHTMLAttributes } from 'vue'
import { NButton, NInput } from 'naive-ui'
import { useAuthStore } from '../../stores/auth'
import UiSteps from '../../components/ui/UiSteps.vue'
import { usePasswordSettings } from './usePasswordSettings'

/** 嵌入分页面板时不再自带上外边距与分隔线，标题降为面板级 h2。 */
const props = defineProps<{ embedded?: boolean }>()
const auth = useAuthStore()
const { fields, errors, success, challenge, busy, isInitialPassword, steps, step, index, isFirst, isLast,
  sendCode, next, back, submit } = usePasswordSettings(auth)
const { remaining, sending, notice, error: sendError, expired } = challenge
const form = ref<HTMLFormElement | null>(null)
const summary = ref<HTMLElement | null>(null)
const heading = computed(() => props.embedded ? 'h2' : 'h3')
const progress = computed(() => `第 ${index.value + 1} / ${steps.value.length} 步：${step.value.title}`)
const inputProps = (key: string, id: string, hintId: string,
  autocomplete: NonNullable<InputHTMLAttributes['autocomplete']>) => ({
  id, autocomplete, 'aria-required': true, 'aria-invalid': !!errors.value[key], 'aria-describedby': hintId,
} as InputHTMLAttributes)

async function advance() {
  const ok = isLast.value ? await submit() : next()
  if (ok) return
  await nextTick()
  const invalid = form.value?.querySelector<HTMLElement>('input[aria-invalid="true"]')
  ;(invalid ?? summary.value)?.focus()
}

/** 上一步保留已获取的验证码与已填密码，只清空当前步的字段错误。 */
function goBack() {
  back()
  void nextTick(() => form.value?.querySelector<HTMLInputElement>('input')?.focus())
}
</script>

<template>
  <section :class="embedded ? 'grid gap-5' : 'mt-6 border-0 border-t border-solid border-line pt-6'" aria-labelledby="password-heading">
    <header class="grid gap-1">
      <component :is="heading" class="m-0 text-[18px]" id="password-heading">{{ isInitialPassword ? '设置登录密码' : '更换登录密码' }}</component>
      <p class="m-0 text-[13px] leading-[1.8] text-body">{{ isInitialPassword ? '邮箱已验证，无需再次获取验证码。设置密码即可完成注册，以后也可使用邮箱和密码登录。' : '先验证当前邮箱，再设置新密码。更新密码后，其他旧登录会话将失效。' }}</p>
    </header>

    <template v-if="steps.length > 1">
      <UiSteps :items="steps" :current="index" label="更换密码步骤" />
      <p class="m-0 text-[12px] text-body" role="status">{{ progress }}</p>
    </template>

    <form ref="form" novalidate class="grid gap-4" :aria-busy="busy" @submit.prevent="advance">
      <div v-if="auth.error" ref="summary" class="rounded-xl border border-solid border-red bg-soft px-4 py-3 text-[13px] leading-[1.7] text-red-hover" role="alert" tabindex="-1">
        {{ auth.error }}
      </div>

      <div v-if="step.id === 'code'" class="grid gap-2">
        <label class="text-[14px] font-semibold" for="settings-code">当前邮箱验证码 <span class="text-red-hover" aria-hidden="true">*</span></label>
        <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <n-input v-model:value="fields.code" placeholder="6 位数字" :maxlength="6" :disabled="busy"
            v-bind="errors.code ? { status: 'error' as const } : {}"
            :input-props="inputProps('code', 'settings-code', 'settings-code-hint', 'one-time-code')" />
          <n-button secondary :loading="sending" :disabled="busy || remaining > 0" @click="sendCode">{{ remaining ? `${remaining} 秒后重发` : '获取验证码' }}</n-button>
        </div>
        <p id="settings-code-hint" class="m-0 text-[12px] leading-[1.7] wrap-anywhere" :class="errors.code ? 'text-red-hover' : 'text-body'">
          {{ errors.code || sendError || notice || `验证码将发送至 ${auth.user?.email ?? ''}` }}
        </p>
        <p v-if="expired" class="m-0 text-[12px] leading-[1.7] text-red-hover" role="status">验证码已过期，请重新获取。</p>
      </div>

      <template v-else>
        <div class="grid gap-2">
          <label class="text-[14px] font-semibold" for="settings-password">新密码 <span class="text-red-hover" aria-hidden="true">*</span></label>
          <n-input v-model:value="fields.password" type="password" placeholder="设置新的登录密码" :maxlength="128" :disabled="busy"
            v-bind="errors.password ? { status: 'error' as const } : {}"
            :input-props="inputProps('password', 'settings-password', 'settings-password-hint', 'new-password')" />
          <p id="settings-password-hint" class="m-0 text-[12px] leading-[1.7] wrap-anywhere" :class="errors.password ? 'text-red-hover' : 'text-body'">
            {{ errors.password || '建议使用至少 12 个字符的长密码，最终要求以平台安全策略为准。' }}
          </p>
        </div>
        <div class="grid gap-2">
          <label class="text-[14px] font-semibold" for="settings-confirmation">再次输入新密码 <span class="text-red-hover" aria-hidden="true">*</span></label>
          <n-input v-model:value="fields.confirmation" type="password" placeholder="确认新密码" :maxlength="128" :disabled="busy"
            v-bind="errors.confirmation ? { status: 'error' as const } : {}"
            :input-props="inputProps('confirmation', 'settings-confirmation', errors.confirmation ? 'settings-confirmation-error' : 'settings-confirmation-hint', 'new-password')" />
          <p v-if="errors.confirmation" id="settings-confirmation-error" class="m-0 text-[12px] leading-[1.7] wrap-anywhere text-red-hover">{{ errors.confirmation }}</p>
          <p v-else id="settings-confirmation-hint" class="m-0 text-[12px] leading-[1.7] text-body">两次输入必须一致。</p>
        </div>
      </template>

      <p v-if="success" class="m-0 text-[13px] leading-[1.7] text-body" role="status">{{ success }}</p>

      <div class="flex flex-wrap gap-3">
        <n-button v-if="!isFirst" secondary :disabled="busy" @click="goBack">上一步</n-button>
        <n-button type="primary" attr-type="submit" :loading="auth.busy" :disabled="busy">
          {{ isLast ? (isInitialPassword ? '设置密码并完成注册' : '保存新密码') : '下一步' }}
        </n-button>
      </div>
    </form>
  </section>
</template>
