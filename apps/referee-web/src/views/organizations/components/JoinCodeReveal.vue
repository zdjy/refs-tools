<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton } from 'naive-ui'
import { Copy, Eye, EyeOff, TriangleAlert } from '@lucide/vue'
import { maskJoinCode } from '../organizations.presentation'

/**
 * 成员码明文只展示一次：整块用沙金底和实线边框标出，强调「关闭后无法再次查看」。
 * 明文默认遮蔽，只有点眼睛按钮才展开——场边人多、屏幕容易被旁人看到，露出需要显式操作。
 * 成员码用等宽字体并允许整段选中，复制被浏览器拒绝时给出手动复制的说明（由 notice 传入）。
 * 这里的等宽字体用于凭据这类需要逐字符核对的内容，不是装饰。
 */
const props = defineProps<{ token: string; hint: string; notice: string }>()
defineEmits<{ copy: []; dismiss: [] }>()

const shown = ref(false)
const display = computed(() => (shown.value ? props.token : maskJoinCode(props.token)))
</script>

<template>
  <section aria-labelledby="reveal-title" class="grid gap-3 border-0 border-l border-solid border-ink pl-4 compact:p-5">
    <h3 id="reveal-title" class="m-0 flex items-center gap-2 text-base text-ink"><TriangleAlert class="size-4" :stroke-width="1.75" aria-hidden="true" />新成员码（末位 {{ hint }}）</h3>
    <p class="m-0 text-sm leading-relaxed text-ink">请现在复制并保存。关闭后无法再次查看，丢失只能撤销后重新生成。成员码默认遮蔽，点眼睛按钮可查看完整明文。</p>
    <div class="flex items-start gap-2">
      <p class="m-0 min-w-0 flex-1 border-0 border-l border-solid border-ink py-0.5 pl-3 font-mono text-sm leading-relaxed break-all text-ink"
        :class="shown ? 'select-all' : 'select-none'" data-testid="join-token">{{ display }}</p>
      <button type="button" :aria-pressed="shown" :aria-label="shown ? '隐藏成员码明文' : '显示成员码明文'"
        class="inline-flex size-11 shrink-0 items-center justify-center rounded-full border-0 bg-soft text-ink hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        @click="shown = !shown">
        <EyeOff v-if="shown" class="size-4" :stroke-width="1.75" aria-hidden="true" />
        <Eye v-else class="size-4" :stroke-width="1.75" aria-hidden="true" />
      </button>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <n-button type="primary" @click="$emit('copy')"><template #icon><Copy class="size-4" aria-hidden="true" /></template>复制成员码</n-button>
      <n-button secondary @click="$emit('dismiss')"><template #icon><EyeOff class="size-4" aria-hidden="true" /></template>我已保存，关闭</n-button>
    </div>
    <p v-if="notice" role="status" class="m-0 text-[13px] text-ink">{{ notice }}</p>
  </section>
</template>
