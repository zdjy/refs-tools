<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useDialog, useMessage } from 'naive-ui'
import { Building2, ChevronDown, LogOut, MessageSquare, Settings, UserRound } from '@lucide/vue'
import { useAuthStore } from '../../stores/auth'
import { accountMenuLinks, type AccountMenuId } from '../../navigation/account-menu.presentation'
import { ACCOUNT_MENU_ID, useAccountMenu } from './useAccountMenu'

const props = defineProps<{ name: string; avatarUrl?: string }>()
const auth = useAuthStore()
const dialog = useDialog()
const message = useMessage()
const trigger = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const { open, toggle, close, onFocusout } = useAccountMenu(trigger, panel)
const icons: Record<AccountMenuId, typeof UserRound> = { profile: UserRound, organizations: Building2, account: Settings, feedback: MessageSquare }
const items = computed(() => accountMenuLinks.map((item) => ({ ...item, icon: icons[item.id] })))
/** 有头像时用图片；缺省或加载失败时回落到昵称首字符，顶栏不出现空位。 */
const initial = computed(() => Array.from(props.name.trim())[0] ?? '我')
const imageFailed = ref(false)
watch(() => props.avatarUrl, () => { imageFailed.value = false })

function confirmLogout(): void {
  close()
  dialog.warning({
    title: '退出登录',
    content: '确认结束当前账号的登录会话？本地比赛记录仍保存在此设备。',
    positiveText: '退出登录',
    negativeText: '取消',
    // 取消后焦点回到触发按钮，避免键盘用户在弹框关闭后丢失位置。
    onAfterLeave: () => trigger.value?.focus(),
    onPositiveClick: async () => {
      if (await auth.logout()) return
      message.error(auth.error || '退出未完成，请检查网络后重试；当前登录可能仍然有效。')
    },
  })
}
</script>

<template>
  <div class="relative min-w-0" @focusout="onFocusout">
    <button
      ref="trigger"
      type="button"
      class="flex min-h-11 max-w-full items-center gap-2 rounded-full border-0 bg-soft px-2 py-1 text-sm font-medium text-ink transition-all duration-200 ease-out hover:bg-sand focus-visible:ring-2 focus-visible:ring-red/30 focus-visible:outline-none active:scale-95"
      :aria-label="`${name}，账号菜单`"
      :aria-expanded="open"
      :aria-controls="open ? ACCOUNT_MENU_ID : undefined"
      @click="toggle($event.detail === 0)"
    >
      <span aria-hidden="true" class="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-ink text-xs font-semibold text-surface">
        <img v-if="avatarUrl && !imageFailed" :src="avatarUrl" alt="" class="size-full object-cover" @error="imageFailed = true" />
        <template v-else>{{ initial }}</template>
      </span>
      <span class="min-w-0 truncate">{{ name }}</span>
      <ChevronDown class="size-4 shrink-0 text-body" :class="open ? 'rotate-180' : ''" :stroke-width="1.5" aria-hidden="true" />
    </button>
    <div
      v-if="open"
      :id="ACCOUNT_MENU_ID"
      ref="panel"
      role="menu"
      aria-label="账号菜单"
      class="absolute top-[calc(100%+8px)] right-0 z-50 w-[264px] max-w-[calc(100vw-32px)] rounded-2xl border border-solid border-line bg-surface py-2 shadow-lift"
    >
      <div class="mx-2 mb-2 border-0 border-b border-solid border-line px-2 pt-1 pb-3">
        <p class="m-0 text-sm font-semibold text-ink wrap-anywhere">{{ name }}</p>
        <p class="mt-1 mb-0 text-xs text-muted">裁判账号</p>
      </div>
      <RouterLink
        v-for="item in items"
        :key="item.id"
        :to="item.path"
        role="menuitem"
        tabindex="-1"
        class="mx-2 flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm font-medium text-body no-underline transition-colors duration-200 hover:bg-soft hover:text-ink focus-visible:bg-soft focus-visible:text-ink focus-visible:ring-2 focus-visible:ring-red/30 focus-visible:outline-none"
        @click="close()"
      >
        <component :is="item.icon" class="size-[18px] shrink-0" :stroke-width="1.5" aria-hidden="true" />
        <span>{{ item.label }}</span>
      </RouterLink>
      <div class="mx-2 my-2 h-px bg-line" role="separator"></div>
      <button
        type="button"
        role="menuitem"
        tabindex="-1"
        class="mx-2 flex min-h-11 items-center gap-3 rounded-xl border-0 bg-transparent px-2 text-left text-sm font-medium text-red transition-colors duration-200 hover:bg-soft hover:text-red-hover focus-visible:bg-soft focus-visible:ring-2 focus-visible:ring-red/30 focus-visible:outline-none"
        @click="confirmLogout"
      >
        <LogOut class="size-[18px] shrink-0" :stroke-width="1.5" aria-hidden="true" />
        <span>退出登录</span>
      </button>
    </div>
  </div>
</template>
