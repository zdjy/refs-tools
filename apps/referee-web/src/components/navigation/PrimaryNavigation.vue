<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { primaryNavigation } from '../../navigation/modules'
import { navigationCurrent } from '../../navigation/navigation.presentation'
import NavigationIcon from './NavigationIcon.vue'
defineProps<{ mobile?: boolean }>()
const route = useRoute()
</script>

<template>
  <nav :aria-label="mobile ? '移动主导航' : '主导航'" :class="mobile ? 'fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-0 border-t border-solid border-line bg-canvas/85 px-1 pt-1 pb-[max(4px,env(safe-area-inset-bottom))] backdrop-blur-xl tablet:hidden' : 'hidden shrink-0 items-center gap-1 tablet:flex'">
    <RouterLink v-for="item in primaryNavigation" :key="item.id" :to="item.path" :aria-current="navigationCurrent(route.meta.navigation, route.path, item)" :class="[
      'flex min-h-11 min-w-11 items-center justify-center rounded-xl font-medium no-underline transition-all duration-200 ease-out hover:bg-soft hover:text-ink active:scale-95',
      mobile ? 'flex-col gap-1 px-1 py-2 text-xs' : 'gap-2 px-3 py-2 text-sm',
      route.meta.navigation === item.id ? 'bg-sand font-semibold text-ink shadow-selected' : 'text-body',
    ]">
      <NavigationIcon v-if="mobile" :name="item.id" :class="['size-5', route.meta.navigation === item.id ? 'text-red' : '']" />
      <!-- 激活指示点使用球场红，状态同时由 aria-current 与底色传达。 -->
      <span v-else-if="route.meta.navigation === item.id" aria-hidden="true" class="size-1.5 rounded-full bg-red"></span>
      <span>{{ item.title }}</span>
    </RouterLink>
  </nav>
</template>
