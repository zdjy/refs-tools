<script setup lang="ts">
import { computed, nextTick, ref, type InputHTMLAttributes } from 'vue'
import { NAlert, NButton, NInput } from 'naive-ui'
import { useAuthStore } from '../../../stores/auth'
import { useEmailChange } from '../../../features/account/useEmailChange'
import UiSteps from '../../../components/ui/UiSteps.vue'
import { useUiFeedback } from '../../../components/ui/useUiFeedback'

const auth = useAuthStore()
const { fields, errors, success, busy, requiresPassword, steps, step, index, isFirst, isLast,
  oldChallenge, newChallenge, sendOld, sendNew, next, back, submit } = useEmailChange(auth)
useUiFeedback(success)
const form = ref<HTMLFormElement | null>(null)
const summary = ref<HTMLElement | null>(null)
const hint = (key: string, fallback: string) => errors.value[key] || fallback
const invalid = (key: string) => !!errors.value[key]
/** 字段错误以 composable 的错误键为准，DOM id 只用于标签关联。 */
const inputProps = (key: string, id: string, hintId: string,
  autocomplete: NonNullable<InputHTMLAttributes['autocomplete']>, extra: InputHTMLAttributes = {}) => ({
  id, autocomplete, 'aria-required': true, 'aria-invalid': invalid(key), 'aria-describedby': hintId, ...extra,
} as InputHTMLAttributes)

async function advance() {
  const ok = isLast.value ? await submit() : next()
  if (ok) return
  await nextTick()
  const target = form.value?.querySelector<HTMLElement>('[aria-invalid="true"]')
  ;(target ?? summary.value)?.focus()
}

/** 上一步不清空已获取的验证码，只在返回时清掉本步的字段错误。 */
function goBack() {
  back()
  void nextTick(() => form.value?.querySelector<HTMLInputElement>('input')?.focus())
}

const progress = computed(() => `${index.value + 1} / ${steps.value.length}`)
</script>

<template>
  <section class="grid gap-5" aria-labelledby="profile-email-heading">
    <header class="grid gap-1">
      <h2 id="profile-email-heading" class="m-0 text-[18px]">修改登录邮箱</h2>
      <p class="m-0 text-[13px] leading-[1.8] text-body">
        当前邮箱：<span class="wrap-anywhere">{{ auth.user?.email }}</span>（{{ auth.user?.emailVerified ? '已验证' : '待验证' }}）。
        共 {{ steps.length }} 步，切换后其他设备的会话会立即失效。
      </p>
    </header>

    <UiSteps :items="steps" :current="index" label="更换邮箱步骤" />
    <p class="m-0 text-[12px] text-body" role="status">第 {{ progress }} 步：{{ step.title }}</p>

    <form ref="form" novalidate class="grid gap-4" :aria-busy="busy" @submit.prevent="advance">
      <div v-if="auth.error" ref="summary" tabindex="-1" role="alert"
        class="rounded-xl border border-solid border-red bg-soft px-4 py-3 text-[13px] leading-[1.7] text-red-hover">{{ auth.error }}</div>

      <div v-if="step.id === 'old'" class="grid gap-2">
        <label class="text-[14px] font-semibold" for="email-old-code">当前邮箱验证码 <span class="text-red-hover" aria-hidden="true">*</span></label>
        <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <n-input v-model:value="fields.oldCode" placeholder="6 位数字" :maxlength="6" :disabled="busy"
            v-bind="invalid('oldCode') ? { status: 'error' as const } : {}"
            :input-props="inputProps('oldCode', 'email-old-code', 'email-old-code-hint', 'one-time-code', { inputmode: 'numeric' })" />
          <n-button secondary :loading="oldChallenge.sending.value" :disabled="busy || oldChallenge.remaining.value > 0" @click="sendOld">
            {{ oldChallenge.remaining.value ? `${oldChallenge.remaining.value} 秒后重发` : '获取验证码' }}
          </n-button>
        </div>
        <p id="email-old-code-hint" class="m-0 text-[12px] leading-[1.7]" :class="invalid('oldCode') ? 'text-red-hover' : 'text-body'">
          {{ hint('oldCode', oldChallenge.error.value || oldChallenge.notice.value || '验证码将发送到当前邮箱，用于确认你仍能接收原邮箱邮件。') }}
        </p>
      </div>

      <div v-else-if="step.id === 'password'" class="grid gap-2">
        <label class="text-[14px] font-semibold" for="email-password">当前登录密码 <span class="text-red-hover" aria-hidden="true">*</span></label>
        <n-input v-model:value="fields.password" type="password" placeholder="输入当前密码" :maxlength="128" :disabled="busy"
          v-bind="invalid('password') ? { status: 'error' as const } : {}"
          :input-props="inputProps('password', 'email-password', 'email-password-hint', 'current-password')" />
        <p id="email-password-hint" class="m-0 text-[12px] leading-[1.7]" :class="invalid('password') ? 'text-red-hover' : 'text-body'">
          {{ hint('password', requiresPassword ? '邮箱与密码同时验证通过才允许切换，避免会话被他人接管后直接换绑。' : '') }}
        </p>
      </div>

      <template v-else>
        <div class="grid gap-2">
          <label class="text-[14px] font-semibold" for="email-new">新邮箱地址 <span class="text-red-hover" aria-hidden="true">*</span></label>
          <n-input v-model:value="fields.newEmail" placeholder="new@example.com" :maxlength="254" :disabled="busy"
            v-bind="invalid('newEmail') ? { status: 'error' as const } : {}"
            :input-props="inputProps('newEmail', 'email-new', 'email-new-hint', 'email', { inputmode: 'email' })" />
          <p id="email-new-hint" class="m-0 text-[12px] leading-[1.7]" :class="invalid('newEmail') ? 'text-red-hover' : 'text-body'">
            {{ hint('newEmail', '新邮箱将成为唯一登录邮箱，且必须未被其他账号使用。') }}
          </p>
        </div>
        <div class="grid gap-2">
          <label class="text-[14px] font-semibold" for="email-new-code">新邮箱验证码 <span class="text-red-hover" aria-hidden="true">*</span></label>
          <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
            <n-input v-model:value="fields.newCode" placeholder="6 位数字" :maxlength="6" :disabled="busy"
              v-bind="invalid('newCode') ? { status: 'error' as const } : {}"
              :input-props="inputProps('newCode', 'email-new-code', 'email-new-code-hint', 'one-time-code', { inputmode: 'numeric' })" />
            <n-button secondary :loading="newChallenge.sending.value" :disabled="busy || newChallenge.remaining.value > 0" @click="sendNew">
              {{ newChallenge.remaining.value ? `${newChallenge.remaining.value} 秒后重发` : '发送到新邮箱' }}
            </n-button>
          </div>
          <p id="email-new-code-hint" class="m-0 text-[12px] leading-[1.7]" :class="invalid('newCode') ? 'text-red-hover' : 'text-body'">
            {{ hint('newCode', newChallenge.error.value || newChallenge.notice.value || '验证码将发送到新邮箱，用于确认该地址归你所有。') }}
          </p>
        </div>
      </template>

      <p v-if="success" role="status" class="m-0 text-[13px] leading-[1.7] text-body">{{ success }}</p>

      <div class="flex flex-wrap gap-3">
        <n-button v-if="!isFirst" secondary :disabled="busy" @click="goBack">上一步</n-button>
        <n-button type="primary" attr-type="submit" :loading="busy" :disabled="busy">
          {{ isLast ? '更换登录邮箱' : '下一步' }}
        </n-button>
      </div>
    </form>

    <n-alert v-if="!auth.user?.emailVerified" type="info" :show-icon="false">
      当前邮箱尚未验证。更换邮箱后会自动标记为已验证，可继续进行考试与认证等核心操作。
    </n-alert>
  </section>
</template>
