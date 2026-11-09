<script setup lang="ts">
import { computed } from 'vue'
import { NInput, NSelect } from 'naive-ui'
import type { QualificationLevel } from '@refs-tools/contracts/certifications'
import { qualificationLevelLabels } from '../certifications.presentation'
import type { CertificationDraft, CertificationFieldKey } from '../useCertificationDraft'

/** 审核所需的最小材料字段。日期可空，表示证书上未标注；其余字段与证书一致。 */
defineProps<{ problems: Partial<Record<CertificationFieldKey, string>>; disabled: boolean }>()
const fields = defineModel<CertificationDraft>('fields', { required: true })
const levelOptions = (Object.keys(qualificationLevelLabels) as QualificationLevel[])
  .map((value) => ({ value, label: qualificationLevelLabels[value] }))
const today = computed(() => new Date().toISOString().slice(0, 10))
</script>

<template>
  <div class="grid gap-5">
    <div class="grid gap-2">
      <label id="cert-level-label" class="text-sm font-medium text-ink">认证级别</label>
      <n-select id="cert-level" aria-labelledby="cert-level-label" v-model:value="fields.level" :options="levelOptions" :disabled="disabled" />
      <p class="m-0 text-[13px] leading-relaxed text-body">级别只作为标签保存，不排序，也不自动授予角色。</p>
    </div>
    <div class="grid gap-2">
      <label for="cert-number" class="text-sm font-medium text-ink">证书编号</label>
      <n-input id="cert-number" v-model:value="fields.certificateNumber" :maxlength="120" :disabled="disabled"
        placeholder="与证书原件一致" :status="problems.certificateNumber ? 'error' : 'success'"
        :input-props="{ 'aria-invalid': !!problems.certificateNumber, 'aria-describedby': problems.certificateNumber ? 'cert-number-error' : undefined, autocomplete: 'off' }" />
      <p v-if="problems.certificateNumber" id="cert-number-error" role="alert" class="m-0 text-[13px] text-danger">{{ problems.certificateNumber }}</p>
    </div>
    <div class="grid gap-2">
      <label for="cert-issuer" class="text-sm font-medium text-ink">发证机构</label>
      <n-input id="cert-issuer" v-model:value="fields.issuer" :maxlength="200" :disabled="disabled"
        placeholder="例如：某省篮球协会" :status="problems.issuer ? 'error' : 'success'"
        :input-props="{ 'aria-invalid': !!problems.issuer, 'aria-describedby': problems.issuer ? 'cert-issuer-error' : undefined, autocomplete: 'off' }" />
      <p v-if="problems.issuer" id="cert-issuer-error" role="alert" class="m-0 text-[13px] text-danger">{{ problems.issuer }}</p>
    </div>
    <div class="grid gap-2">
      <label for="cert-obtained" class="text-sm font-medium text-ink">取得日期（可留空）</label>
      <input id="cert-obtained" v-model="fields.obtainedAt" type="date" :max="today" :disabled="disabled"
        class="min-h-11 w-full rounded-xl border border-solid border-line bg-surface px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        :class="problems.obtainedAt ? 'border-danger' : ''"
        :aria-invalid="!!problems.obtainedAt" :aria-describedby="problems.obtainedAt ? 'cert-obtained-error' : undefined" />
      <p v-if="problems.obtainedAt" id="cert-obtained-error" role="alert" class="m-0 text-[13px] text-danger">{{ problems.obtainedAt }}</p>
    </div>
    <div class="grid gap-2">
      <label for="cert-statement" class="text-sm font-medium text-ink">个人声明</label>
      <n-input id="cert-statement" v-model:value="fields.statement" type="textarea" :maxlength="2000" show-count
        :autosize="{ minRows: 4, maxRows: 10 }" :disabled="disabled" placeholder="说明材料真实性、执裁经历与申请理由"
        :status="problems.statement ? 'error' : 'success'"
        :input-props="{ 'aria-invalid': !!problems.statement, 'aria-describedby': problems.statement ? 'cert-statement-error' : 'cert-statement-hint' }" />
      <p v-if="problems.statement" id="cert-statement-error" role="alert" class="m-0 text-[13px] text-danger">{{ problems.statement }}</p>
      <p v-else id="cert-statement-hint" class="m-0 text-[13px] leading-relaxed text-body">请如实填写。声明与材料会保存在认证历史中，仅本人和当前审核范围可读取。</p>
    </div>
  </div>
</template>
