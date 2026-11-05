<script setup lang="ts">
import { computed, useId, watch } from 'vue'
import { NButton } from 'naive-ui'
import type { DirectUploadApi, UploadOptions } from './direct-upload'
import { useMediaUpload } from './useMediaUpload'

const props = defineProps<{ options: UploadOptions; api?: DirectUploadApi; label?: string }>()
const emit = defineEmits<{ available: [mediaId: string] }>()
const id = useId()
const { state, start, retry, cancel } = useMediaUpload(props.api)
const busy = computed(() => ['authorizing', 'uploading', 'verifying'].includes(state.value.status))
const messages = { idle: '选择文件后直接上传到私有存储。离开页面将停止当前上传。', authorizing: '正在申请上传授权…',
  uploading: '正在直传文件…', verifying: '正在核验上传结果…', available: '文件已上传并通过核验。', failed: '上传尚未完成。' }
function select(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void start(file, props.options)
}
watch(() => state.value.status, (status) => {
  if (status === 'available' && state.value.mediaId) emit('available', state.value.mediaId)
})
</script>

<template>
  <section class="grid min-w-0 gap-3 border-0 border-t border-solid border-ink pt-4 text-ink">
    <label :for="id" class="font-semibold">{{ label ?? '上传附件' }}</label>
    <input :id="id" type="file" :disabled="busy" :aria-describedby="`${id}-status`"
      class="min-h-[44px] w-full min-w-0 text-body" @click="($event.target as HTMLInputElement).value = ''" @change="select" />
    <p v-if="state.fileName" class="m-0 break-all text-sm text-body">{{ state.fileName }}</p>
    <p :id="`${id}-status`" role="status" aria-atomic="true" class="m-0 text-sm text-body">{{ messages[state.status] }}</p>
    <p v-if="state.error" role="alert" class="m-0 text-sm text-danger">{{ state.error }}</p>
    <div class="flex flex-wrap gap-3">
      <NButton v-if="state.status === 'failed'" type="primary" @click="retry">重试上传</NButton>
      <NButton v-if="busy || state.status === 'failed'" @click="cancel">取消上传</NButton>
    </div>
  </section>
</template>
