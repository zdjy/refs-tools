<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight } from '@lucide/vue'
import type { MyOrganization } from '@refs-tools/contracts/organization-self'
import { linkButton } from '../organizations.presentation'

/**
 * 组织工作区的认证审核入口。只负责说明与导航，不在这里读取队列；
 * 认证员审核普通认证，负责人复核申诉，两种能力可同时存在。
 */
const props = defineProps<{ organization: MyOrganization }>()
const isCertifier = computed(() => props.organization.roles.includes('certifier'))
const isOwner = computed(() => props.organization.isOwner)
const path = computed(() => `/organizations/${props.organization.id}/certifications/review`)
</script>

<template>
  <section aria-labelledby="org-certifications-title" class="grid gap-4">
    <h2 id="org-certifications-title" class="m-0 text-lg text-ink">认证审核</h2>
    <p class="m-0 max-w-[64ch] text-sm leading-relaxed text-body">
      审核本组织成员提交的认证材料。你不能审核本人申请；申诉由负责人复核，原审核人与申请人必须回避。
    </p>
    <ul class="m-0 grid list-none gap-3 p-0">
      <li v-if="isCertifier" class="grid gap-1 border-0 border-l border-solid border-line pl-3">
        <span class="text-sm font-semibold text-ink">待审核</span>
        <span class="text-[13px] leading-relaxed text-body">已提交的认证申请。可批准、驳回或要求补件；已批准记录可暂停或撤销。</span>
      </li>
      <li v-if="isOwner" class="grid gap-1 border-0 border-l border-solid border-line pl-3">
        <span class="text-sm font-semibold text-ink">待复核</span>
        <span class="text-[13px] leading-relaxed text-body">对驳回或撤销结果的申诉。仅当你是负责人且不是原审核人或申请人时才可处理。</span>
      </li>
    </ul>
    <div>
      <RouterLink :to="path" :class="linkButton.primary">进入审核工作台<ArrowRight class="size-4" :stroke-width="1.75" aria-hidden="true" /></RouterLink>
    </div>
  </section>
</template>
