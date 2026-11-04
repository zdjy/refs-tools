<template>
  <div class="logo">
    <img :src="logo" alt="" :class="{ 'mr-2': !collapsed }" />
    <h2 v-show="!collapsed" class="title">{{ websiteConfig.title }}</h2>
  </div>
</template>

<script setup lang="ts">
  import { websiteConfig } from '@/config/website.config';
  import { useBrandLogo } from '@/hooks/setting/useBrandLogo';

  defineOptions({ name: 'Logo' });
  defineProps<{ collapsed?: boolean }>();

  const logo = useBrandLogo();
</script>

<style lang="less" scoped>
  .logo {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 64px;
    line-height: 64px;
    overflow: hidden;
    white-space: nowrap;

    img {
      width: auto;
      height: 32px;
    }

    .title {
      margin: 0;
    }
  }
</style>
