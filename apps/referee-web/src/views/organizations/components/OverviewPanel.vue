<script setup lang="ts">
import { computed } from 'vue'
import { NAlert, NButton, NInput } from 'naive-ui'
import { LogOut, Pencil } from '@lucide/vue'
import type { MyOrganization, OrganizationProfileUpdated } from '@refs-tools/contracts/organization-self'
import UiSubmitHint from '../../../components/ui/UiSubmitHint.vue'
import { useUiFeedback } from '../../../components/ui/useUiFeedback'
import { useOrganizationProfile } from '../useOrganizationProfile'

/**
 * 概览：简介与本人的成员关系。简介只有组织负责人可改（服务端同样只认组织记录上的负责人），
 * pending 申请显示「撤回申请」，active 成员显示「退出组织」；负责人不能直接退出
 * （需先移交所有权），因此只说明原因而不给无效按钮。
 */
const props = defineProps<{ organization: MyOrganization; refresh: () => Promise<boolean> }>()
const emit = defineEmits<{ leave: []; saved: [OrganizationProfileUpdated] }>()
const profile = useOrganizationProfile(computed(() => props.organization), value => emit('saved', value), () => props.refresh())
useUiFeedback(profile.action.done)
</script>

<template>
  <div class="grid gap-6">
    <section aria-labelledby="about-title" class="grid gap-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 id="about-title" class="m-0 text-lg text-ink">组织简介</h2>
        <n-button v-if="organization.isOwner && !profile.editing.value" secondary @click="profile.open()">
          <template #icon><Pencil class="size-4" aria-hidden="true" /></template>编辑简介
        </n-button>
      </div>
      <form v-if="profile.editing.value" class="grid gap-3" @submit.prevent="profile.save()">
        <label for="organization-purpose" class="text-[13px] text-body">简介内容（最多 1000 字，说明面向的赛事、培训或遴选范围）</label>
        <n-input id="organization-purpose" v-model:value="profile.draft.value" type="textarea" :autosize="{ minRows: 4, maxRows: 10 }"
          maxlength="1000" show-count placeholder="该组织尚未填写简介。" />
        <p v-if="profile.notice.value" role="status" class="m-0 text-[13px] leading-relaxed text-body">{{ profile.notice.value }}</p>
        <n-alert v-if="profile.action.error.value" type="error" :show-icon="false" role="alert">
          {{ profile.action.error.value }}<n-button text type="primary" class="ml-2" :loading="profile.reloading.value" @click="profile.reload()">重新读取</n-button>
        </n-alert>
        <div class="flex flex-wrap gap-2">
          <n-button type="primary" attr-type="submit" :loading="profile.action.busy.value" :disabled="!profile.canSave.value">保存简介</n-button>
          <n-button secondary :disabled="profile.action.busy.value" @click="profile.close()">取消</n-button>
        </div>
        <UiSubmitHint :busy="profile.action.busy.value" />
      </form>
      <p v-else class="m-0 max-w-[68ch] text-sm leading-relaxed text-body wrap-anywhere">{{ organization.purpose || '该组织尚未填写简介。' }}</p>
    </section>
    <section aria-labelledby="mine-title" class="grid gap-3 border-0 border-t border-solid border-line pt-6">
      <h2 id="mine-title" class="m-0 text-lg text-ink">我的成员关系</h2>
      <p class="m-0 text-sm leading-relaxed text-body">
        <template v-if="organization.membership?.status === 'pending'">你的加入申请正在等待组织管理者审核，审核通过前没有成员权限。</template>
        <template v-else-if="organization.isOwner">你是该组织的负责人。负责人不能直接退出，请先到「移交」标签页把负责人身份移交给另一位正式成员，或联系平台管理员处理。</template>
        <template v-else>你是该组织的正式成员。退出后将撤销你在该组织及其赛事中的全部角色，重新加入不会恢复这些角色。</template>
      </p>
      <div v-if="organization.membership && !organization.isOwner">
        <n-button secondary @click="$emit('leave')"><template #icon><LogOut class="size-4" aria-hidden="true" /></template>{{ organization.membership.status === 'pending' ? '撤回申请' : '退出组织' }}</n-button>
      </div>
    </section>
  </div>
</template>
