<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { NAlert, NButton } from 'naive-ui'
import type { ApplicantProfile } from '../useApplicantProfile'
import { linkButton } from '../organizations.presentation'

/**
 * 负责人即申请人，实名与联系方式取自账号资料，这里只读展示并说明去哪里修改。
 * 设置页在新标签页打开：当前表单里已填写的内容不会因为跳转而丢失。
 */
defineProps<{ applicant: ApplicantProfile }>()
defineEmits<{ reload: [] }>()
</script>

<template>
  <section class="grid gap-3" aria-labelledby="applicant-title">
    <h3 id="applicant-title" class="m-0 text-sm font-medium text-ink">负责人（即你本人）</h3>
    <p v-if="applicant.state.status === 'loading' || applicant.state.status === 'idle'" role="status" class="m-0 text-[13px] leading-relaxed text-body">
      正在读取你的账号资料…
    </p>
    <n-alert v-else-if="applicant.state.status === 'error'" type="warning" :show-icon="false" role="alert">
      <p class="m-0 mb-3 text-sm">{{ applicant.state.error }}</p>
      <n-button class="min-h-11" @click="$emit('reload')">重新读取</n-button>
    </n-alert>
    <template v-else>
      <dl class="m-0 grid gap-x-6 gap-y-2 text-sm compact:grid-cols-2">
        <div class="grid gap-1"><dt class="text-[13px] text-body">真实姓名</dt><dd class="m-0 text-ink">{{ applicant.state.legalName || '未填写' }}</dd></div>
        <div class="grid gap-1"><dt class="text-[13px] text-body">联系手机号</dt><dd class="m-0 font-mono text-ink">{{ applicant.state.phone || '未填写' }}</dd></div>
      </dl>
      <n-alert v-if="applicant.missing.length" type="warning" :show-icon="false" role="alert">
        <p class="m-0 mb-3 text-sm">账号资料还缺{{ applicant.missing.join('、') }}，补全后才能提交申请。</p>
        <div class="flex flex-wrap gap-3">
          <RouterLink to="/profile-setting" target="_blank" rel="noopener" :class="linkButton.secondary">去账号设置补全（新标签页）</RouterLink>
          <n-button class="min-h-11" @click="$emit('reload')">我已补全，重新读取</n-button>
        </div>
      </n-alert>
      <p v-else class="m-0 text-[13px] leading-relaxed text-body">
        提交时会取这两项作为负责人实名与联系方式，仅供平台审核，不会在目录或成员名单中公开。要修改请到
        <RouterLink to="/profile-setting" target="_blank" rel="noopener" class="text-ink underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">账号设置</RouterLink>（新标签页），改后点「重新读取」。
      </p>
      <n-button v-if="!applicant.missing.length" class="min-h-11 w-fit" quaternary @click="$emit('reload')">重新读取</n-button>
    </template>
  </section>
</template>
