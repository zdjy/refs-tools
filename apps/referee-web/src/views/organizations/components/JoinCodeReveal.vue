<script setup lang="ts">
import { NButton } from 'naive-ui'
import { Copy, EyeOff, TriangleAlert } from '@lucide/vue'

/**
 * 成员码明文只展示一次：整块用沙金底和实线边框标出，强调「关闭后无法再次查看」。
 * 成员码用等宽字体并允许整段选中，复制被浏览器拒绝时给出手动复制的说明（由 notice 传入）。
 * 这里的等宽字体用于凭据这类需要逐字符核对的内容，不是装饰。
 */
defineProps<{ token: string; hint: string; notice: string }>()
defineEmits<{ copy: []; dismiss: [] }>()
</script>

<template>
  <section aria-labelledby="reveal-title" class="grid gap-3 rounded-2xl border border-solid border-ink bg-sand p-4 compact:p-5">
    <h3 id="reveal-title" class="m-0 flex items-center gap-2 text-base text-ink"><TriangleAlert class="size-4" :stroke-width="1.75" aria-hidden="true" />新成员码（末位 {{ hint }}）</h3>
    <p class="m-0 text-sm leading-relaxed text-ink">请现在复制并保存。关闭后无法再次查看，丢失只能撤销后重新生成。</p>
    <p class="m-0 select-all rounded-xl border border-solid border-line bg-surface px-4 py-3 font-mono text-sm leading-relaxed break-all text-ink" data-testid="join-token">{{ token }}</p>
    <div class="flex flex-wrap items-center gap-2">
      <n-button type="primary" @click="$emit('copy')"><template #icon><Copy class="size-4" aria-hidden="true" /></template>复制成员码</n-button>
      <n-button secondary @click="$emit('dismiss')"><template #icon><EyeOff class="size-4" aria-hidden="true" /></template>我已保存，关闭</n-button>
    </div>
    <p v-if="notice" role="status" class="m-0 text-[13px] text-ink">{{ notice }}</p>
  </section>
</template>
