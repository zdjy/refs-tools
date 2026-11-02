<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useSessionStore } from '../../stores/session'
import { adminModules } from '../../router/modules'
const session = useSessionStore()
</script>

<template>
  <div class="grid gap-6">
    <header class="rounded-3xl bg-sand p-6 md:p-8">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="m-0 text-sm font-medium text-body">平台管理工作区</p>
          <h1 class="mb-3 mt-3 text-3xl font-bold tracking-tight">运营工作台</h1>
          <p class="mb-0 max-w-2xl text-sm leading-relaxed text-body">从业务流程进入处理工作。当前已接通登录会话与平台审计，其他模块将随业务 API 逐步开放。</p>
        </div>
        <span class="rounded-full bg-surface px-4 py-2 text-xs font-semibold">分阶段接入</span>
      </div>
    </header>
    <section class="grid gap-6 tablet:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div class="rounded-2xl border border-solid border-line bg-surface p-6">
        <h2 class="mb-2 mt-0 text-xl">查阅操作依据</h2>
        <p class="mb-5 text-sm leading-relaxed text-body">按资源与作用域查询平台审计，追溯角色变更、审核决定及受保护资源访问。记录只读，每次查询也会留痕。</p>
        <RouterLink to="/audit" class="inline-flex min-h-[44px] items-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-surface no-underline transition-colors hover:bg-black active:scale-[0.98]">查询操作审计</RouterLink>
        <p class="mb-0 mt-4 text-xs text-body">仅平台管理员可读取；无权限将明确提示。</p>
      </div>
      <div class="rounded-2xl border border-solid border-line bg-surface p-6">
        <h2 class="mb-4 mt-0 text-xl">当前会话</h2>
        <dl class="m-0 grid gap-3 text-sm">
          <div><dt class="text-body">登录账号</dt><dd class="m-0 mt-1 break-all font-medium">{{ session.user?.email }}</dd></div>
          <div><dt class="text-body">身份验证</dt><dd class="m-0 mt-1">{{ session.user?.emailVerified ? '邮箱已验证' : '邮箱尚未验证' }}</dd></div>
        </dl>
        <p class="mb-0 mt-4 text-xs leading-relaxed text-body">会话仅保存在内存中，业务权限以服务端实时检查为准。</p>
      </div>
    </section>
    <section aria-labelledby="modules-heading">
      <div class="mb-4"><h2 id="modules-heading" class="mb-2 mt-0 text-xl">业务工作区</h2><p class="m-0 text-sm text-body">先查看流程与权限边界；待接入模块不会产生业务操作。</p></div>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <RouterLink v-for="module in adminModules" :key="module.path" :to="module.path"
          class="flex min-w-0 flex-col rounded-2xl border border-solid border-line bg-surface p-5 no-underline transition-colors hover:border-red active:scale-[0.98]">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="m-0 text-lg">{{ module.title }}</h3>
            <span class="rounded-full bg-soft px-3 py-1 text-xs font-medium text-body">待接入<span v-if="'beta' in module"> · Beta</span></span>
          </div>
          <p class="mb-5 text-sm leading-relaxed text-body">{{ module.summary }}</p>
          <span class="mt-auto text-sm font-semibold">查看工作流程</span>
        </RouterLink>
      </div>
    </section>
    <p class="m-0 text-xs leading-relaxed text-body">当前不提供全量统计；业务待办数量将在真实聚合接口就绪后展示，不以示例数据代替。</p>
  </div>
</template>
