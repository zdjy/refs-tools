<script setup lang="ts">
import { RouterLink } from 'vue-router'
defineProps<{ account?: boolean }>()
</script>

<template>
  <div class="min-h-screen bg-canvas">
    <header class="flex min-h-16 items-center justify-between gap-2 border-0 border-b border-solid border-line bg-surface px-4 py-2 md:px-8">
      <RouterLink class="inline-flex min-h-11 items-center gap-2.5 text-[14px] font-bold text-ink no-underline" to="/workbench"><span class="grid size-7 place-items-center rounded-full bg-ink text-surface" aria-hidden="true">R</span>裁判工具箱</RouterLink>
      <RouterLink class="inline-flex min-h-11 items-center text-[12px] text-body no-underline hover:text-red sm:text-[14px]" to="/workbench">进入本地工作台</RouterLink>
    </header>
    <main id="auth-main" class="mx-auto max-w-[1280px] md:grid md:min-h-[calc(100vh-64px)] md:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
      <section class="relative overflow-hidden bg-sand px-6 py-8 sm:px-8 sm:py-10 md:flex md:flex-col md:justify-center md:px-8 md:py-12 lg:px-14 lg:py-16" aria-labelledby="auth-intro-title">
        <div class="auth-facet pointer-events-none absolute inset-y-0 right-0 left-[52%] bg-facet opacity-85" aria-hidden="true"></div>
        <div class="relative">
          <p class="mt-0 mr-0 mb-3 ml-0 text-[12px] font-bold tracking-[.06em] text-red">{{ account ? '账号与安全' : '篮球裁判综合工作台' }}</p>
          <h1 class="m-0 text-[30px] leading-[1.35] tracking-[-.04em] whitespace-pre-line sm:text-[36px] lg:text-[44px]" id="auth-intro-title">{{ account ? '专注场上，\n安心连接。' : '每一次判罚，\n从充分准备开始。' }}</h1>
          <p class="mt-4 mr-0 mb-0 ml-0 max-w-[360px] text-[14px] leading-[1.8] text-body lg:mt-6 lg:text-[16px]">{{ account ? '在这里管理你的登录方式与会话，守护属于你的裁判档案。' : '用一个账号连接学习、考试与裁判履职，让场下的积累，成为场上的底气。' }}</p>
          <div class="hidden md:mt-12 md:flex md:items-start md:gap-3 md:border-0 md:border-t md:border-solid md:border-body md:pt-6">
            <svg class="size-6 shrink-0 basis-6 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 3 4 6v6c0 4 8 9 8 9s8-5 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/></svg>
            <p class="m-0 text-[13px] leading-[1.8]">你的账号，独立的访问边界。<br><span class="text-body">个人材料与业务记录按授权范围访问。</span></p>
          </div>
        </div>
        <p class="relative hidden text-[12px] text-body md:mt-16 md:block">为裁判的每一份专业，做好准备。</p>
      </section>
      <section class="min-w-0 px-4 pt-6 pb-[max(32px,env(safe-area-inset-bottom))] xs:px-5 md:flex md:flex-col md:justify-center md:px-6 md:py-12 lg:px-12 lg:py-14" :aria-label="account ? '账号管理' : '账号登录与注册'">
        <slot />
        <p class="mx-auto mt-6 mb-0 max-w-[440px] text-center text-[12px] leading-[1.8] text-body">本地工作台无需登录即可使用。<br>比赛会话保存在当前设备，请注意共享设备上的数据安全。</p>
      </section>
    </main>
  </div>
</template>
