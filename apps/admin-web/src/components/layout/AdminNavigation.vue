<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { adminModules } from '../../router/modules'

defineEmits<{ navigate: [] }>()
const groups = ['运营管理', '学习与考试', '安全与治理']
const linkClass = 'flex min-h-[44px] items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-medium no-underline transition-colors hover:bg-facet focus-visible:outline-red'
</script>

<template>
  <nav aria-label="管理端主导航" class="flex flex-col gap-5">
    <div>
      <p class="mb-2 mt-0 px-4 text-xs font-semibold text-body">工作空间</p>
      <RouterLink to="/" :class="linkClass" exact-active-class="bg-surface text-red" @click="$emit('navigate')">运营工作台</RouterLink>
    </div>
    <div v-for="group in groups" :key="group">
      <p class="mb-2 mt-0 px-4 text-xs font-semibold text-body">{{ group }}</p>
      <RouterLink v-for="module in adminModules.filter(item => item.group === group)" :key="module.path"
        :to="module.path" :class="linkClass" exact-active-class="bg-surface text-red" @click="$emit('navigate')">
        {{ module.title }}
        <span v-if="'beta' in module" class="text-xs text-body">Beta</span>
      </RouterLink>
      <RouterLink v-if="group === '安全与治理'" to="/audit" :class="linkClass" exact-active-class="bg-surface text-red" @click="$emit('navigate')">操作审计</RouterLink>
    </div>
  </nav>
</template>
