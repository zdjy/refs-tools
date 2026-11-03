<template>
  <RouterView>
    <template #default="{ Component, route }">
      <component :is="Component" :key="route.fullPath" />
    </template>
  </RouterView>
</template>

<script lang="ts" setup>
import { RouterView } from 'vue-router'
</script>
