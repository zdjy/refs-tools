<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { primaryNavigation } from '../../navigation/modules'
import { navigationCurrent } from '../../navigation/navigation.presentation'
import NavigationIcon from './NavigationIcon.vue'
defineProps<{ mobile?: boolean }>()
const route = useRoute()
</script>

<template>
  <nav :aria-label="mobile ? '移动主导航' : '主导航'" :class="mobile ? 'fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-0 border-t border-solid border-line bg-surface px-1 pt-1 pb-[max(4px,env(safe-area-inset-bottom))] tablet:hidden' : 'hidden shrink-0 items-center gap-1 tablet:flex'">
    <RouterLink v-for="item in primaryNavigation" :key="item.id" :to="item.path" :aria-current="navigationCurrent(route.meta.navigation, route.path, item)" :class="[
      'flex min-h-11 min-w-11 items-center justify-center rounded-full font-medium no-underline transition-all duration-300 hover:text-red active:scale-95',
      mobile ? 'flex-col gap-1 px-1 py-2 text-xs' : 'px-3 py-2 text-sm',
      route.meta.navigation === item.id ? 'bg-soft text-red-hover' : 'text-body',
    ]">
      <NavigationIcon v-if="mobile" :name="item.id" class="size-5" />
      <span>{{ item.title }}</span>
    </RouterLink>
  </nav>
</template>
