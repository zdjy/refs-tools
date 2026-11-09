<script setup lang="ts">
import type { CertificationStatus } from '@refs-tools/contracts/certifications'
import { certificationStatusText, certificationStatusTone } from '../certifications.presentation'

/** 状态胶囊：色点加文字，文字始终存在，不单靠颜色表达结论。 */
withDefaults(defineProps<{ status: CertificationStatus; text?: string }>(), {})
</script>

<template>
  <span class="inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold whitespace-nowrap" :class="certificationStatusTone[status].pill">
    <span class="size-1.5 shrink-0 rounded-full" :class="certificationStatusTone[status].dot" aria-hidden="true"></span>
    {{ text ?? certificationStatusText[status].label }}
  </span>
</template>
