<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { primaryNavigation } from '../../navigation/modules'
import { navigationCurrent } from '../../navigation/navigation.presentation'

const route = useRoute()
</script>

<template>
  <nav aria-label="主导航" class="hidden shrink-0 items-center gap-1 tablet:flex">
    <RouterLink v-for="item in primaryNavigation" :key="item.id" :to="item.path" :aria-current="navigationCurrent(route.meta.navigation, route.path, item)" :class="[
      'flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium no-underline transition-all duration-200 ease-out hover:bg-soft hover:text-ink active:scale-95',
      route.meta.navigation === item.id ? 'bg-sand font-semibold text-ink shadow-selected' : 'text-body',
    ]">
      <!-- 激活指示点使用球场红，状态同时由 aria-current 与底色传达。 -->
      <span v-if="route.meta.navigation === item.id" aria-hidden="true" class="size-1.5 rounded-full bg-red"></span>
      <span>{{ item.title }}</span>
    </RouterLink>
  </nav>
</template>
