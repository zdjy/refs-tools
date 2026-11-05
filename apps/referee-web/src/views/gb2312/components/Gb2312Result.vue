<script setup lang="ts">
import { Copy } from '@lucide/vue'
import { NButton } from 'naive-ui'
import type { Gb2312CharacterResult } from '@refs-tools/domain'
import { reasonLabels, resultMessage, resultTone, statusLabels } from '../gb2312.presentation'

defineProps<{ result: Gb2312CharacterResult }>()
const emit = defineEmits<{ copy: [label: string, value: string | undefined] }>()
</script>

<template>
  <div class="mt-4 rounded-xl border border-solid border-line bg-soft p-4 compact:p-5" :data-tone="resultTone(result)">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h3 class="m-0 text-xl font-bold text-ink"><span class="sr-only">查询结果：</span>{{ result.character ?? '暂无结果' }}</h3>
      <span class="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-body">{{ statusLabels[result.status] }}</span>
    </div>
    <p v-if="result.reason" class="mt-4 mb-0 text-sm leading-relaxed text-body" role="status">{{ reasonLabels[result.reason] }}</p>
    <dl v-else class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm compact:grid-cols-4">
      <div><dt class="text-body">区位码</dt><dd class="mt-1 font-mono font-semibold text-ink">{{ result.fields?.zoneCode ?? '不适用' }}</dd></div>
      <div><dt class="text-body">国标码</dt><dd class="mt-1 font-mono font-semibold text-ink">{{ result.fields?.nationalCode ?? '不适用' }}</dd></div>
      <div><dt class="text-body">机内码</dt><dd class="mt-1 font-mono font-semibold text-ink">{{ result.fields?.machineCode ?? (result.asciiHex ? `00${result.asciiHex}` : '不适用') }}</dd></div>
      <div><dt class="text-body">Unicode</dt><dd class="mt-1 font-mono font-semibold text-ink">{{ result.codePoint }}</dd></div>
    </dl>
    <n-button v-if="result.character" class="mt-4" secondary size="small" @click="emit('copy', 'character', result.character)"><Copy :size="15" aria-hidden="true" />复制字符</n-button>
  </div>
</template>
