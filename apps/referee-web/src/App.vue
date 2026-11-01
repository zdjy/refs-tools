<script setup lang="ts">
import { NConfigProvider, NGlobalStyle, zhCN, dateZhCN } from 'naive-ui'
import { refereeTheme } from './ui-theme'
import WorkbenchView from './views/workbench/WorkbenchView.vue'
</script>

<template>
  <n-config-provider :theme-overrides="refereeTheme" :locale="zhCN" :date-locale="dateZhCN">
    <!-- 将主题同步到 body，避免组件库默认全局字体覆盖设计 token。 -->
    <n-global-style />
    <WorkbenchView />
  </n-config-provider>
</template>
