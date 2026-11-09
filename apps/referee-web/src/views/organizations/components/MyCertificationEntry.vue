<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight } from '@lucide/vue'
import type { MyOrganization } from '@refs-tools/contracts/organization-self'
import { linkButton } from '../organizations.presentation'

/**
 * 普通成员的认证入口独立成标签，避免藏在概览里难以发现。
 * 这里只负责说明与导航，申请、材料与历史统一在认证与资质页处理。
 */
const props = defineProps<{ organization: MyOrganization }>()
const path = computed(() => `/certifications?organizationId=${encodeURIComponent(props.organization.id)}`)
</script>

<template>
  <section aria-labelledby="my-certification-title" class="grid gap-4">
    <h2 id="my-certification-title" class="m-0 text-lg text-ink">我的认证</h2>
    <p class="m-0 max-w-[64ch] text-sm leading-relaxed text-body">
      你是本组织的正式成员，可以提交本组织的裁判认证。材料先保存为草稿，确认后再提交，由本组织认证员审核。
    </p>
    <ol class="m-0 grid list-none gap-3 p-0">
      <li class="grid gap-1 border-0 border-l border-solid border-line pl-3">
        <span class="text-sm font-semibold text-ink">提交材料</span>
        <span class="text-[13px] leading-relaxed text-body">上传证书原件与履历材料；不同认证范围分别上传，不能共用。</span>
      </li>
      <li class="grid gap-1 border-0 border-l border-solid border-line pl-3">
        <span class="text-sm font-semibold text-ink">等待审核</span>
        <span class="text-[13px] leading-relaxed text-body">组织认证由本组织认证员审核；通过后可继续申请平台认证。</span>
      </li>
      <li class="grid gap-1 border-0 border-l border-solid border-line pl-3">
        <span class="text-sm font-semibold text-ink">结果与申诉</span>
        <span class="text-[13px] leading-relaxed text-body">驳回或撤销可提交申诉；待复核期间原结论与效力不变。</span>
      </li>
    </ol>
    <div>
      <RouterLink :to="path" :class="linkButton.primary">进入认证与资质<ArrowRight class="size-4" :stroke-width="1.75" aria-hidden="true" /></RouterLink>
    </div>
    <p class="m-0 text-[13px] leading-relaxed text-body">平台认证、材料历史与申诉也在这个入口统一查看。</p>
  </section>
</template>
