<script setup lang="ts">
import { ref } from 'vue'
import { NButton } from 'naive-ui'
import { Trash2 } from '@lucide/vue'
import MediaUpload from '../../../features/media/MediaUpload.vue'
import type { UploadOptions } from '../../../features/media/direct-upload'

/**
 * 认证材料上传与已关联列表。每个范围单独上传；已关联材料只显示序号，不暴露对象键或签名。
 * 达到上限或正在提交时不再接受新文件，仍可移除未提交前选错的材料。
 */
const props = defineProps<{
  label: string; hint: string; ids: string[]; options: UploadOptions; problem?: string | undefined; disabled: boolean; max: number
}>()
const emit = defineEmits<{ add: [mediaId: string]; remove: [index: number]; busy: [value: boolean] }>()
const names = ref<Record<string, string>>({})
function available(mediaId: string, fileName: string) { names.value[mediaId] = fileName; emit('add', mediaId) }
</script>

<template>
  <section class="grid gap-3 border-0 border-t border-solid border-line pt-4" :aria-label="label">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h3 class="m-0 text-sm font-semibold text-ink">{{ label }}</h3>
      <span class="font-mono text-[13px] text-body">{{ ids.length }} / {{ max }}</span>
    </div>
    <p class="m-0 text-[13px] leading-relaxed text-body">{{ hint }}</p>
    <ul v-if="ids.length" class="m-0 grid list-none gap-2 p-0">
      <li v-for="(mediaId, index) in ids" :key="mediaId" class="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-solid border-line bg-soft px-3">
        <span class="min-w-0 break-all text-[13px] font-medium text-ink">{{ names[mediaId] || `材料 ${index + 1}` }} · 已上传并核验</span>
        <n-button text :disabled="disabled" :aria-label="`移除${label}第 ${index + 1} 个文件`" @click="emit('remove', index)">
          <template #icon><Trash2 class="size-4" :stroke-width="1.75" aria-hidden="true" /></template>移除
        </n-button>
      </li>
    </ul>
    <MediaUpload v-if="ids.length < max" :options="options" :disabled="disabled" :label="`上传${label}`" @available="available" @busy="emit('busy', $event)" />
    <p v-else class="m-0 text-[13px] leading-relaxed text-body">已达 {{ max }} 个上限，移除后才能继续上传。</p>
    <p v-if="problem" role="alert" class="m-0 text-[13px] text-danger">{{ problem }}</p>
  </section>
</template>
