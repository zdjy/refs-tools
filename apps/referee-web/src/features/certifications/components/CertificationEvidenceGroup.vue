<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { NButton, NModal } from 'naive-ui'
import { FileText } from '@lucide/vue'
import { refereeModalStyle } from '../../../ui-theme'
import { useCertificationEvidence } from '../useCertificationEvidence'

/**
 * 一类认证材料（原件或履历）的查看入口。文件名与类型不出现在列表中，
 * 只有本人或当前审核范围才能换取 60 秒读取链接；关闭弹窗立即丢弃 URL。
 */
const props = defineProps<{ label: string; ids: string[]; certificationId: string; appealId?: string | undefined }>()
const evidence = useCertificationEvidence()
const open = (mediaId: string) => { void evidence.load(props.certificationId, mediaId, props.appealId) }
const close = () => { evidence.close() }
watch(() => [props.certificationId, props.appealId], close)
onBeforeUnmount(close)
</script>

<template>
  <section class="grid gap-2">
    <h4 class="m-0 text-[13px] font-semibold text-body">{{ label }}（{{ ids.length }}）</h4>
    <p v-if="!ids.length" class="m-0 text-[13px] leading-relaxed text-body">没有关联材料。</p>
    <ul v-else class="m-0 flex list-none flex-wrap gap-2 p-0">
      <li v-for="(mediaId, index) in ids" :key="mediaId">
        <button type="button" class="inline-flex min-h-11 items-center gap-2 rounded-full border border-solid border-line bg-soft px-4 text-[13px] font-medium text-ink transition-all duration-200 hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-95"
          :aria-label="`查看${label}第 ${index + 1} 个文件`" @click="open(mediaId)">
          <FileText class="size-4" :stroke-width="1.75" aria-hidden="true" />材料 {{ index + 1 }}
        </button>
      </li>
    </ul>
    <n-modal :show="!!evidence.mediaId.value" preset="card" :title="`${label} · 查看材料`" class="max-w-[880px]" :style="refereeModalStyle"
      :aria-label="`${label}查看`" @update:show="!$event && close()">
      <div class="grid gap-4">
        <p role="status" class="m-0 text-[13px] leading-relaxed text-body">
          {{ evidence.busy.value ? '正在获取读取授权…' : '读取链接 60 秒内有效。请勿截图或转发含个人信息的材料。' }}
        </p>
        <p v-if="evidence.error.value" role="alert" class="m-0 text-sm leading-relaxed text-danger">{{ evidence.error.value }}</p>
        <div class="flex flex-wrap gap-2">
          <n-button v-if="evidence.error.value && evidence.mediaId.value" secondary @click="open(evidence.mediaId.value)">重新获取链接</n-button>
          <a v-if="evidence.url.value" :href="evidence.url.value" target="_blank" rel="noopener noreferrer"
            class="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-surface no-underline transition-all duration-200 hover:bg-black active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">在新标签页打开</a>
        </div>
        <iframe v-if="evidence.url.value" :src="evidence.url.value" :title="`${label}文件预览`" referrerpolicy="no-referrer"
          class="h-[60vh] w-full rounded-xl border border-solid border-line bg-surface"></iframe>
      </div>
    </n-modal>
  </section>
</template>
