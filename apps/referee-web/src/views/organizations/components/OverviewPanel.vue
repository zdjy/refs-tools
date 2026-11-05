<script setup lang="ts">
import { NButton } from 'naive-ui'
import { LogOut } from '@lucide/vue'
import type { MyOrganization } from '@refs-tools/contracts/organization-self'

/**
 * 概览：简介与本人的成员关系。pending 申请显示「撤回申请」，active 成员显示「退出组织」；
 * 负责人不能直接退出（需先移交所有权，移交属于后续平台流程），因此只说明原因而不给无效按钮。
 */
defineProps<{ organization: MyOrganization }>()
defineEmits<{ leave: [] }>()
</script>

<template>
  <div class="grid gap-6">
    <section aria-labelledby="about-title" class="grid gap-2">
      <h2 id="about-title" class="m-0 text-lg text-ink">组织简介</h2>
      <p class="m-0 max-w-[68ch] text-sm leading-relaxed text-body wrap-anywhere">{{ organization.purpose || '该组织尚未填写简介。' }}</p>
    </section>
    <section aria-labelledby="mine-title" class="grid gap-3 border-0 border-t border-solid border-line pt-6">
      <h2 id="mine-title" class="m-0 text-lg text-ink">我的成员关系</h2>
      <p class="m-0 text-sm leading-relaxed text-body">
        <template v-if="organization.membership?.status === 'pending'">你的加入申请正在等待组织管理者审核，审核通过前没有成员权限。</template>
        <template v-else-if="organization.isOwner">你是该组织的负责人。负责人不能直接退出，所有权移交需联系平台管理员。</template>
        <template v-else>你是该组织的正式成员。退出后将撤销你在该组织及其赛事中的全部角色，重新加入不会恢复这些角色。</template>
      </p>
      <div v-if="organization.membership && !organization.isOwner">
        <n-button secondary @click="$emit('leave')"><template #icon><LogOut class="size-4" aria-hidden="true" /></template>{{ organization.membership.status === 'pending' ? '撤回申请' : '退出组织' }}</n-button>
      </div>
    </section>
  </div>
</template>
