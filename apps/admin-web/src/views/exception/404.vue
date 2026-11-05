<template>
  <section
    class="mx-auto flex min-h-[60vh] max-w-[520px] flex-col items-start justify-center gap-4 px-4 py-12"
    aria-labelledby="not-found-title"
  >
    <p class="m-0 text-6xl font-semibold leading-none tabular-nums text-admin-primary" aria-hidden="true">404</p>
    <h1 id="not-found-title" class="m-0 text-2xl font-semibold text-admin-ink">页面不存在</h1>
    <p class="m-0 text-sm leading-relaxed text-admin-body">
      没有找到
      <code class="break-all rounded bg-admin-surface-muted px-1.5 py-0.5 text-admin-ink">{{ route.fullPath }}</code>。地址可能输入有误，或该页面已下线。
    </p>
    <div class="mt-2 flex flex-wrap gap-3">
      <n-button type="primary" size="large" @click="goHome">回到首页</n-button>
      <n-button size="large" @click="goBack">返回上一页</n-button>
    </div>
  </section>
</template>

<script lang="ts" setup>
  import { useRoute, useRouter } from 'vue-router';
  import { PageEnum } from '@/enums/pageEnum';

  const route = useRoute();
  const router = useRouter();

  function goHome() {
    router.push(PageEnum.BASE_HOME);
  }
  /** 直接打开 404 地址时没有可返回的历史，退回首页而不是停在原地。 */
  function goBack() {
    if (window.history.state?.back) router.back();
    else goHome();
  }
</script>
