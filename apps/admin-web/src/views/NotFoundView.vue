<template>
  <div class="flex min-h-[60vh] flex-col justify-center py-12">
    <div class="text-center">
      <p class="font-mono text-sm text-body">404</p>
      <h1 class="py-5 text-2xl text-ink">抱歉，你访问的页面不存在</h1>
      <NButton type="primary" @click="goHome">回到工作台</NButton>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { NButton } from 'naive-ui';
  import { useRouter } from 'vue-router';
  const router = useRouter();
  function goHome() {
    router.push('/');
  }
</script>
