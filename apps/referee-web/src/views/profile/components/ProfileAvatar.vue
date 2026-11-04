<script setup lang="ts">
import { computed, useId } from 'vue'
import { NButton } from 'naive-ui'
import type { UploadState } from '../../../features/media/direct-upload'

const props = defineProps<{ url: string; name: string; state: UploadState; busy: boolean }>()
const emit = defineEmits<{ select: [file: File]; retry: []; remove: [] }>()
const id = useId()
const initial = computed(() => [...props.name.trim()][0] ?? '?')
const uploading = computed(() => ['authorizing', 'uploading', 'verifying'].includes(props.state.status))
const progress = computed(() => ({
  authorizing: '正在申请上传授权…', uploading: '正在上传头像…', verifying: '正在核验上传结果…',
}[props.state.status as 'authorizing' | 'uploading' | 'verifying'] ?? ''))

function pick(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) emit('select', file)
}
</script>

<template>
  <section aria-labelledby="profile-avatar-heading" class="grid gap-4">
    <h2 id="profile-avatar-heading" class="m-0 text-[16px]">头像</h2>
    <div class="flex flex-wrap items-center gap-4">
      <span class="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-solid border-line bg-soft text-[28px] font-semibold text-ink" aria-hidden="true">
        <img v-if="url" :src="url" alt="" class="size-full object-cover" />
        <template v-else>{{ initial }}</template>
      </span>
      <div class="grid min-w-0 flex-1 gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <label :for="id" class="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-soft px-4 text-[13px] font-semibold hover:bg-line focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink">{{ uploading ? '头像上传中…' : '选择头像图片' }}</label>
          <input :id="id" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" :disabled="busy || uploading" @change="pick" />
          <n-button v-if="state.status === 'failed'" secondary @click="emit('retry')">重试上传</n-button>
          <n-button v-if="url && !uploading" secondary :disabled="busy" @click="emit('remove')">移除头像</n-button>
        </div>
        <p class="m-0 text-[12px] leading-[1.7] text-body" :class="state.error ? 'text-red-hover' : ''" role="status">
          {{ state.error ?? (uploading ? progress : '支持 JPEG、PNG、WebP，保存为不超过 2 MiB、最长边 1600px 的预览图。') }}
        </p>
      </div>
    </div>
  </section>
</template>
