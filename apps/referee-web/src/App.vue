<script setup lang="ts">
import { NConfigProvider, NDialogProvider, NGlobalStyle, NMessageProvider, zhCN, dateZhCN } from 'naive-ui'
import { RouterView } from 'vue-router'
import { refereeTheme } from './ui-theme'
</script>

<template>
  <n-config-provider :theme-overrides="refereeTheme" :locale="zhCN" :date-locale="dateZhCN">
    <!-- 将主题同步到 body，避免组件库默认全局字体覆盖设计 token。 -->
    <n-global-style />
    <!-- 账号菜单的退出确认与失败提示按实际需求在表现层接入，见 FS-0020。 -->
    <n-dialog-provider>
      <n-message-provider>
        <RouterView />
      </n-message-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>
