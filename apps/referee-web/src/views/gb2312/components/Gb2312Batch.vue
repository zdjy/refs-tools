<script setup lang="ts">
import { NButton, NEmpty } from 'naive-ui'
import { Copy } from '@lucide/vue'
import type { Gb2312BatchResult, Gb2312CharacterResult } from '@refs-tools/domain'
import { statusLabels } from '../gb2312.presentation'

defineProps<{ result: Gb2312BatchResult; rows: readonly Gb2312CharacterResult[] }>()
const emit = defineEmits<{ copy: [label: string, value: string | undefined] }>()
</script>

<template>
  <div class="mt-4 rounded-xl border border-solid border-line bg-soft p-4 compact:p-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div><p class="m-0 text-xs font-bold uppercase tracking-wider text-red-hover">批量结果</p><p class="mt-2 mb-0 text-sm text-body">{{ result.gb2312Count }} 个汉字 · {{ result.asciiCount }} 个 ASCII · {{ result.unsupportedCount }} 个未支持</p></div>
      <n-button secondary size="small" :disabled="!result.input" @click="emit('copy', 'batch', result.items.map((item) => item.character ?? '�').join(''))"><Copy :size="15" aria-hidden="true" />复制转换结果</n-button>
    </div>
    <div v-if="rows.length" class="mt-4 overflow-x-auto rounded-xl border border-solid border-line bg-surface">
      <table class="w-full min-w-[560px] border-collapse text-left text-sm">
        <caption class="sr-only">批量转换结果</caption>
        <thead><tr class="border-0 border-b border-solid border-line text-xs text-body"><th class="px-3 py-3 font-medium">字符</th><th class="px-3 py-3 font-medium">类型</th><th class="px-3 py-3 font-medium">区位码</th><th class="px-3 py-3 font-medium">机内码</th><th class="px-3 py-3 font-medium">Unicode</th></tr></thead>
        <tbody><tr v-for="(item, index) in rows" :key="`${item.input}-${index}`" class="border-0 border-b border-solid border-line last:border-0"><td class="px-3 py-3 text-lg font-semibold">{{ item.character }}</td><td class="px-3 py-3 text-body">{{ statusLabels[item.status] }}</td><td class="px-3 py-3 font-mono">{{ item.fields?.zoneCode ?? '不适用' }}</td><td class="px-3 py-3 font-mono">{{ item.fields?.machineCode ?? (item.asciiHex ? `00${item.asciiHex}` : '不适用') }}</td><td class="px-3 py-3 font-mono text-xs">{{ item.codePoint }}</td></tr></tbody>
      </table>
    </div>
    <n-empty v-else class="py-6" description="输入文本后查看逐字符结果" :show-icon="false" />
  </div>
</template>
