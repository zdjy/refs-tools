<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ShieldCheck } from '@lucide/vue'
import SkipLink from '../../../components/navigation/SkipLink.vue'
import BrandLink from '../../../components/navigation/BrandLink.vue'
import UiCourtLines from '../../../components/ui/UiCourtLines.vue'
defineProps<{ account?: boolean }>()
</script>

<template>
  <div class="min-h-screen bg-canvas">
    <SkipLink target="#auth-main" />
    <header class="flex min-h-16 items-center justify-between gap-2 border-0 border-b border-solid border-line bg-canvas/90 px-4 py-2 backdrop-blur-md md:px-8">
      <BrandLink />
      <RouterLink class="inline-flex min-h-11 items-center text-[12px] text-body no-underline hover:text-red sm:text-[14px]" to="/workbench">进入本地工作台</RouterLink>
    </header>
    <main id="auth-main" tabindex="-1" class="mx-auto max-w-[1280px] tablet:grid tablet:min-h-[calc(100vh-64px)] tablet:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
      <section class="relative overflow-hidden bg-sand px-6 py-8 sm:px-8 sm:py-10 compact:px-10 md:py-12 tablet:flex tablet:flex-col tablet:justify-center tablet:px-8 xl:px-14 xl:py-16" aria-labelledby="auth-intro-title">
        <div class="auth-facet pointer-events-none absolute inset-y-0 right-0 left-[52%] bg-facet opacity-85" aria-hidden="true"></div>
        <UiCourtLines class="pointer-events-none absolute right-2 -bottom-8 hidden h-56 w-auto text-body/25 tablet:block" />
        <div class="relative">
          <h1 class="text-ink m-0 text-[30px] leading-[1.35] tracking-[-.04em] whitespace-pre-line sm:text-[36px] xl:text-[44px]" id="auth-intro-title">{{ account ? '专注场上，\n安心连接。' : '每一次判罚，\n从充分准备开始。' }}</h1>
          <p class="mt-4 mr-0 mb-0 ml-0 max-w-[360px] text-[14px] leading-[1.8] text-body xl:mt-6 xl:text-[16px]">{{ account ? '在这里管理你的登录方式与会话，守护属于你的裁判档案。' : '用一个账号连接学习、考试与裁判履职，让场下的积累，成为场上的底气。' }}</p>
          <div class="hidden tablet:mt-12 tablet:flex tablet:items-start tablet:gap-3 tablet:border-0 tablet:border-t tablet:border-solid tablet:border-body tablet:pt-6">
            <ShieldCheck class="size-6 shrink-0 basis-6 text-ink" :stroke-width="1.5" aria-hidden="true" />
            <p class="m-0 text-[13px] leading-[1.8]">你的账号，独立的访问边界。<br><span class="text-body">个人材料与业务记录按授权范围访问。</span></p>
          </div>
        </div>
        <p class="relative hidden text-[12px] text-body tablet:mt-16 tablet:block">为裁判的每一份专业，做好准备。</p>
      </section>
      <section class="min-w-0 px-4 pt-6 pb-[max(32px,env(safe-area-inset-bottom))] xs:px-5 compact:px-8 md:py-10 tablet:flex tablet:flex-col tablet:justify-center tablet:px-6 tablet:py-12 xl:px-12 xl:py-14" :aria-label="account ? '账号管理' : '账号登录与注册'">
        <slot />
        <p class="mx-auto mt-6 mb-0 max-w-[440px] text-center text-[12px] leading-[1.8] text-body">本地工作台无需登录即可使用。<br>比赛会话保存在当前设备，请注意共享设备上的数据安全。</p>
      </section>
    </main>
  </div>
</template>
