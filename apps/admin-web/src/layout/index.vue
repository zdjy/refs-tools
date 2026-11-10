<script setup lang="ts">
  /**
   * 布局入口。真正的壳在 `@/components/admin-shell/AdminShell.vue`，
   * 这里只保留路由导入路径，避免改动 `router/constant.ts`。
   */
  import AdminShell from '@/components/admin-shell/AdminShell.vue';
</script>

<template>
  <AdminShell />
</template>
