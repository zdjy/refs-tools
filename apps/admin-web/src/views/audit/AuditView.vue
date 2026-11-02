<script setup lang="ts">
import { onMounted, onScopeDispose } from 'vue'
import { NButton } from 'naive-ui'
import { RouterLink } from 'vue-router'
import { useSessionStore } from '../../stores/session'
import { useAudit } from './useAudit'
import AuditFilters from './components/AuditFilters.vue'
import AuditRecords from './components/AuditRecords.vue'

const session = useSessionStore()
const { filters, fieldError, result, loading, error, forbidden, search, next, retry, reset, dispose } = useAudit(session.invalidate)
onMounted(() => { void search() })
onScopeDispose(dispose)
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
</script>

<template>
  <div class="grid gap-6">
    <header>
      <p class="mb-3 mt-0 text-sm font-medium text-body">安全与治理</p>
      <h1 class="mb-3 mt-0 text-3xl font-bold tracking-tight">操作审计</h1>
      <p class="m-0 max-w-3xl text-sm leading-relaxed text-body">追溯平台受保护操作。记录仅供授权人员查阅，不提供修改或清空。时间按设备时区 {{ timezone }} 显示。</p>
    </header>
    <AuditFilters v-model:scope-type="filters.scopeType" v-model:resource-type="filters.resourceType" v-model:resource-id="filters.resourceId"
      :loading="loading" :field-error="fieldError" @search="search" @reset="reset" />
    <section :aria-busy="loading" aria-labelledby="audit-results-title">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="audit-results-title" class="m-0 text-lg font-semibold">查询结果</h2>
        <span v-if="result" role="status" class="text-sm text-body">本页 {{ result.items.length }} 条 · 每批最多 20 条</span>
      </div>
      <p v-if="loading" role="status" class="rounded-2xl bg-soft p-6 text-sm text-body">正在读取审计记录…</p>
      <div v-else-if="error" role="alert" class="rounded-2xl border border-solid border-line bg-surface p-6">
        <h3 class="mb-2 mt-0 text-lg">{{ forbidden ? '没有平台审计权限' : '读取未完成' }}</h3>
        <p class="text-sm leading-relaxed text-body">{{ error }}</p>
        <div class="flex flex-wrap items-center gap-4"><NButton @click="retry">重新尝试</NButton><RouterLink to="/" class="inline-flex min-h-[44px] items-center text-sm font-semibold hover:text-red">返回工作台</RouterLink></div>
      </div>
      <template v-else-if="result">
        <div v-if="!result.items.length" class="rounded-2xl border border-solid border-line bg-surface p-6">
          <h3 class="mb-2 mt-0 text-lg">没有匹配的审计记录</h3><p class="mb-0 text-sm text-body">可以调整资源或作用域筛选后重新查询。</p>
        </div>
        <AuditRecords v-else :items="result.items" />
        <div class="mt-5 flex flex-wrap items-center gap-3">
          <NButton :disabled="!result.nextCursor || loading" @click="next">下一页</NButton>
          <NButton :disabled="loading" @click="search">从首批重新查询</NButton>
          <span v-if="!result.nextCursor" class="text-xs text-body">已到当前查询末尾</span>
        </div>
      </template>
    </section>
  </div>
</template>
