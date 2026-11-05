<script setup lang="ts">
import { ref } from 'vue'
import { NInput } from 'naive-ui'
import { Eye, EyeOff } from '@lucide/vue'

/**
 * 平台邀请码输入。默认按密码型遮蔽，避免被旁人看到；显示开关用 44×44 的原生按钮，
 * 而不是 Naive 输入框内置的 16px 图标（达不到触控目标要求）。样式与成员码展示块的眼睛按钮一致。
 * 校验文案由父组件传入并用 aria-describedby 关联，本组件只负责输入与显示切换。
 */
defineProps<{ error: string; busy: boolean }>()
const token = defineModel<string>({ required: true })
const shown = ref(false)
</script>

<template>
  <div class="grid gap-2">
    <label for="app-invite" class="text-sm font-medium text-ink">平台邀请码（可选）</label>
    <div class="flex items-start gap-2">
      <n-input id="app-invite" v-model:value="token" class="min-w-0 flex-1" :type="shown ? 'text' : 'password'"
        placeholder="没有邀请码可留空，提交后由平台审核" :maxlength="60" :disabled="busy" :status="error ? 'error' : 'success'"
        :input-props="{ 'aria-invalid': !!error, 'aria-describedby': error ? 'app-invite-error' : 'app-invite-hint', autocomplete: 'off', spellcheck: false }" />
      <button type="button" :aria-pressed="shown" :aria-label="shown ? '隐藏邀请码' : '显示邀请码'" :disabled="busy"
        class="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-soft text-ink hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
        @click="shown = !shown">
        <EyeOff v-if="shown" class="size-4" :stroke-width="1.75" aria-hidden="true" />
        <Eye v-else class="size-4" :stroke-width="1.75" aria-hidden="true" />
      </button>
    </div>
    <p v-if="error" id="app-invite-error" role="alert" class="m-0 text-[13px] text-danger">{{ error }}</p>
    <p v-else id="app-invite-hint" class="m-0 text-[13px] text-body">持平台发放的一次性邀请码可直接创建并启用组织，免平台审核；邀请码与组织成员码不通用。</p>
  </div>
</template>
