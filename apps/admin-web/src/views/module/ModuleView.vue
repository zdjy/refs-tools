<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { AdminModule } from '../../router/modules'
defineProps<{ module: AdminModule }>()
</script>

<template>
  <div class="grid gap-6">
    <header>
      <div class="mb-3 flex flex-wrap items-center gap-3"><span class="rounded-full bg-sand px-4 py-2 text-xs font-semibold">待接入业务 API</span><span v-if="'beta' in module" class="text-sm text-body">Beta</span></div>
      <h1 class="mb-3 mt-0 text-3xl font-bold tracking-tight">{{ module.title }}</h1>
      <p class="m-0 text-base leading-relaxed text-body">{{ module.summary }}</p>
    </header>
    <section class="rounded-2xl border border-solid border-line bg-surface p-6 md:p-8">
      <h2 class="mb-5 mt-0 text-xl">工作流程</h2>
      <ol class="m-0 grid list-decimal gap-5 pl-6 text-sm leading-relaxed">
        <li v-for="step in module.steps" :key="step" class="pl-2">{{ step }}</li>
      </ol>
    </section>
    <section class="rounded-2xl bg-sand p-6">
      <h2 class="mb-4 mt-0 text-xl">权限与处理边界</h2>
      <p class="text-sm leading-relaxed"><strong>适用人员：</strong>{{ module.scope }}</p>
      <p class="mb-0 text-sm leading-relaxed text-body">{{ module.boundary }}</p>
    </section>
    <section class="rounded-2xl border border-solid border-line bg-surface p-6">
      <h2 class="mb-3 mt-0 text-xl">为什么还不能处理业务？</h2>
      <p class="text-sm leading-relaxed text-body">本模块依赖{{ module.dependency }}，当前尚未接通。此页仅说明计划流程，不展示真实或模拟申请，也不提交审核、发布及处罚操作。</p>
      <p class="text-sm leading-relaxed text-body">接口就绪后将补充列表、详情、确认与冲突处理，按管理端实施规格逐项验收。</p>
      <RouterLink to="/" class="inline-flex min-h-[44px] items-center font-semibold hover:text-red">返回运营工作台</RouterLink>
    </section>
  </div>
</template>
