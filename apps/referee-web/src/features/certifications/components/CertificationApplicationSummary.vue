<script setup lang="ts">
import type { CertificationDraft } from '../useCertificationDraft'
import { qualificationLevelLabels } from '../certifications.presentation'
defineProps<{ fields: CertificationDraft; organizationName: string }>()
</script>

<template>
  <section aria-labelledby="application-check-title" class="grid gap-5">
    <h3 id="application-check-title" class="m-0 text-lg font-semibold text-ink">核对申请材料</h3>
    <dl class="m-0 grid gap-4 sm:grid-cols-2">
      <div><dt class="text-[13px] text-body">认证范围</dt><dd class="m-0 text-base font-semibold text-ink">{{ fields.scopeType === 'platform' ? '平台认证' : organizationName }}</dd></div>
      <div><dt class="text-[13px] text-body">认证级别</dt><dd class="m-0 text-base text-ink">{{ qualificationLevelLabels[fields.level] }}</dd></div>
      <div><dt class="text-[13px] text-body">证书编号</dt><dd class="m-0 break-all font-mono text-base text-ink">{{ fields.certificateNumber }}</dd></div>
      <div><dt class="text-[13px] text-body">发证机构</dt><dd class="m-0 break-all text-base text-ink">{{ fields.issuer }}</dd></div>
      <div><dt class="text-[13px] text-body">取得日期</dt><dd class="m-0 text-base text-ink">{{ fields.obtainedAt || '未填写' }}</dd></div>
      <div><dt class="text-[13px] text-body">已核验材料</dt><dd class="m-0 text-base text-ink">证书原件 {{ fields.evidenceMediaIds.length }} 份 · 履历 {{ fields.historyMediaIds.length }} 份</dd></div>
    </dl>
    <div class="grid gap-2 border-0 border-t border-solid border-line pt-4">
      <h4 class="m-0 text-sm font-semibold text-body">个人声明</h4>
      <p class="m-0 whitespace-pre-line text-base leading-relaxed text-ink wrap-anywhere">{{ fields.statement }}</p>
    </div>
    <p class="m-0 text-sm leading-relaxed text-body">提交后进入审核队列，审核期间不能编辑。仅保存草稿不会进入审核队列。</p>
  </section>
</template>
