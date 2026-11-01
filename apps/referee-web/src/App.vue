<script setup lang="ts">
import { NConfigProvider, zhCN, dateZhCN } from 'naive-ui'
import { refereeTheme } from './ui-theme'
import WorkbenchView from './views/workbench/WorkbenchView.vue'
</script>

<template>
  <n-config-provider :theme-overrides="refereeTheme" :locale="zhCN" :date-locale="dateZhCN">
    <WorkbenchView />
  </n-config-provider>
</template>
