<template>
  <div class="flex w-full flex-wrap items-center justify-between gap-3 border-0 border-b border-solid border-line px-4 py-3 md:px-6">
    <div class="flex min-w-0 items-center gap-3">
      <NButton
        id="admin-menu-trigger"
        :aria-label="isMobile ? '打开管理菜单' : collapsed ? '展开侧栏' : '收起侧栏'"
        :aria-haspopup="isMobile ? 'dialog' : undefined"
        :aria-expanded="isMobile ? menuOpen : !collapsed"
        @click="handleMenuCollapsed"
      >{{ isMobile ? '菜单' : collapsed ? '展开' : '收起' }}</NButton>
      <NBreadcrumb>
        <NBreadcrumbItem>平台管理</NBreadcrumbItem>
        <NBreadcrumbItem v-for="routeItem in breadcrumbList" :key="routeItem.path">
          <span class="text-sm text-ink">{{ routeItem.meta.title }}</span>
        </NBreadcrumbItem>
      </NBreadcrumb>
    </div>
    <div class="flex min-w-0 items-center gap-3">
      <span class="max-w-40 truncate text-sm text-body">{{ session.user?.displayName }}</span>
      <NButton :loading="session.busy" :disabled="session.busy" @click="session.logout">退出登录</NButton>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { NBreadcrumb, NBreadcrumbItem, NButton } from 'naive-ui'
import { useRoute } from 'vue-router'
import { useSessionStore } from '../../../stores/session'

const props = defineProps<{ collapsed: boolean; isMobile: boolean; menuOpen: boolean }>()
const emit = defineEmits<{ 'update:collapsed': [value: boolean] }>()
const session = useSessionStore()
const route = useRoute()
const breadcrumbList = computed(() => route.matched.filter(item => item.meta.title))
function handleMenuCollapsed() { emit('update:collapsed', !props.collapsed) }
</script>
