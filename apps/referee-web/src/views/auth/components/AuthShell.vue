<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ShieldCheck } from '@lucide/vue'
import SkipLink from '../../../components/navigation/SkipLink.vue'
import BrandLink from '../../../components/navigation/BrandLink.vue'
import UiBackdropToggle from '../../../components/ui/UiBackdropToggle.vue'
import UiCourtBackdrop from '../../../components/ui/UiCourtBackdrop.vue'
defineProps<{ account?: boolean }>()
</script>

<template>
  <div class="isolate min-h-screen bg-canvas">
    <UiCourtBackdrop />
    <SkipLink target="#auth-main" />
    <header class="flex h-14 items-center justify-between gap-2 border-0 border-b border-solid border-line px-4 md:px-8">
      <BrandLink />
      <div class="flex items-center gap-1">
        <UiBackdropToggle compact />
        <RouterLink class="inline-flex min-h-11 items-center text-sm text-body no-underline hover:text-ink" to="/workbench">进入本地工作台</RouterLink>
      </div>
    </header>
    <main id="auth-main" tabindex="-1" class="mx-auto max-w-[1080px] px-4 py-8 compact:px-6 tablet:grid tablet:grid-cols-[minmax(0,1fr)_minmax(0,440px)] tablet:gap-16 tablet:px-8 tablet:py-16">
      <section class="mb-8 tablet:mb-0" aria-labelledby="auth-intro-title">
        <h1 class="m-0 text-[32px] leading-[1.15] font-bold tracking-[-0.025em] text-ink focus:outline-hidden compact:text-[40px]" id="auth-intro-title">{{ account ? '账号与登录方式' : '裁判账号' }}</h1>
        <p class="mt-3 mb-0 max-w-[28em] text-base leading-[1.7] text-body">{{ account ? '管理你的登录方式与会话。' : '登录后可创建或加入组织、回应邀请。学习、认证模块开放后沿用同一账号。' }}</p>
        <ul class="mt-8 mb-0 hidden list-none p-0 tablet:block">
          <li class="flex items-start gap-3 border-0 border-t border-solid border-line py-4">
            <ShieldCheck class="mt-0.5 size-5 shrink-0 text-ink" :stroke-width="1.5" aria-hidden="true" />
            <p class="m-0 text-[15px] leading-[1.7] text-body"><span class="font-semibold text-ink">独立的访问边界。</span>个人材料与业务记录按授权范围访问。</p>
          </li>
        </ul>
      </section>
      <section class="min-w-0" :aria-label="account ? '账号管理' : '账号登录与注册'">
        <slot />
        <p class="mt-6 mb-0 text-[13px] leading-[1.7] text-body">本地工作台无需登录即可使用。比赛会话保存在当前设备，请注意共享设备上的数据安全。</p>
      </section>
    </main>
  </div>
</template>
