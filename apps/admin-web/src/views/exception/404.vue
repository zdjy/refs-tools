<template>
  <section class="exception" aria-labelledby="not-found-title">
    <p class="exception-code" aria-hidden="true">404</p>
    <h1 id="not-found-title" class="exception-title">页面不存在</h1>
    <p class="exception-desc">
      没有找到
      <code class="exception-path">{{ route.fullPath }}</code>
      。地址可能输入有误，或该页面已下线。
    </p>
    <div class="exception-actions">
      <n-button type="primary" @click="goHome">回到首页</n-button>
      <n-button quaternary @click="goBack">返回上一页</n-button>
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

<style scoped>
  .exception {
    display: flex;
    min-height: 60vh;
    max-width: 520px;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: var(--admin-space-lg);
    margin: 0 auto;
    padding: var(--admin-space-4xl) var(--admin-space-md);
  }

  .exception-code {
    font-size: 56px;
    font-weight: 600;
    line-height: 1;
    color: var(--admin-accent);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }

  .exception-title {
    font-size: 20px;
    line-height: 28px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--admin-ink);
  }

  .exception-desc {
    font-size: var(--admin-text-body-size);
    line-height: var(--admin-text-body-leading);
    color: var(--admin-body);
  }

  .exception-path {
    padding: 2px var(--admin-space-sm);
    border-radius: var(--admin-radius-sm);
    background: var(--admin-surface-muted);
    color: var(--admin-ink);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: var(--admin-text-meta-size);
    overflow-wrap: anywhere;
  }

  .exception-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--admin-space-md);
    margin-top: var(--admin-space-md);
  }
</style>
