<script setup lang="ts">
import { NAlert, NButton, NPopconfirm } from 'naive-ui'
import { useUiFeedback } from '../../components/ui/useUiFeedback'
import { cancelButtonProps, confirmButtonProps } from '../../components/ui/confirm-buttons'
import { Eraser, Search } from '@lucide/vue'
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import UiPageBanner from '../../components/ui/UiPageBanner.vue'
import Gb2312Batch from './components/Gb2312Batch.vue'
import Gb2312Result from './components/Gb2312Result.vue'
import { useGb2312 } from './useGb2312'

const {
  characterInput, codeInput, batchInput, characterResult, codeResult, batchResult, batchRows, hasContent, copyError, copyNotice,
  lookupCharacter, lookupCode, convertBatch, clearAll, copy,
} = useGb2312()
useUiFeedback(copyNotice)
useUiFeedback(copyError, 'error')
</script>

<template>
  <NavigationShell>
    <UiPageBanner title="GB 2312 区位码工具" title-id="gb2312-title" description="查询汉字区位码、国标码与十六进制机内码，也可以批量检查文本。ASCII 字符单独标记，未收录字符不会被强行转换。" status="本地工具 · Beta" tone="available">
      <template #actions>
        <n-popconfirm :positive-button-props="confirmButtonProps" :negative-button-props="cancelButtonProps" positive-text="确认清空" negative-text="取消" :disabled="!hasContent" @positive-click="clearAll">
          <template #trigger><n-button secondary :disabled="!hasContent"><Eraser :size="16" aria-hidden="true" />清空</n-button></template>
          清空将删除三项输入的文本与已有查询结果，无法恢复。
        </n-popconfirm>
      </template>
    </UiPageBanner>

    <n-alert v-if="copyError" type="error" role="alert" class="mt-4">{{ copyError }}</n-alert>
    <p v-if="copyNotice" role="status" class="mt-4 text-sm text-green">{{ copyNotice }}</p>

    <section class="mt-6 grid grid-cols-1 gap-4 tablet:grid-cols-2" aria-label="单字符查询">
      <article class="border-0 border-t border-solid border-ink pt-5 compact:p-6">
        <div><h2 class="m-0 text-xl font-bold text-ink">字符 → 编码</h2><p class="mt-2 mb-0 text-sm leading-relaxed text-body">输入一个汉字、英文、数字或符号。</p></div>
        <form class="mt-5" @submit.prevent="lookupCharacter">
          <label for="gb-character" class="sr-only">待查询字符</label>
          <div class="flex flex-col gap-3 compact:flex-row"><input id="gb-character" v-model="characterInput" class="min-h-12 min-w-0 flex-1 rounded-xl border border-transparent bg-soft px-4 text-lg text-ink outline-none transition-all placeholder:text-muted focus:border-accent/40 focus:ring-2 focus:ring-accent/30" maxlength="2" autocomplete="off" placeholder="例如：中" /><n-button attr-type="submit" type="primary"><Search :size="16" aria-hidden="true" />查询</n-button></div>
        </form>
        <Gb2312Result :result="characterResult" @copy="copy" />
      </article>

      <article class="border-0 border-t border-solid border-ink pt-5 compact:p-6">
        <div><h2 class="m-0 text-xl font-bold text-ink">区位码 → 字符</h2><p class="mt-2 mb-0 text-sm leading-relaxed text-body">输入 4 位区位码，例如“5448”对应“中”。</p></div>
        <form class="mt-5" @submit.prevent="lookupCode">
          <label for="gb-code" class="sr-only">四位区位码</label>
          <div class="flex flex-col gap-3 compact:flex-row"><input id="gb-code" v-model="codeInput" class="min-h-12 min-w-0 flex-1 rounded-xl border border-transparent bg-soft px-4 font-mono text-lg tracking-wider text-ink outline-none transition-all placeholder:text-muted focus:border-accent/40 focus:ring-2 focus:ring-accent/30" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="例如：5448" /><n-button attr-type="submit" type="primary"><Search :size="16" aria-hidden="true" />反查</n-button></div>
        </form>
        <Gb2312Result :result="codeResult" @copy="copy" />
      </article>
    </section>

    <section class="mt-4 border-0 border-t border-solid border-ink pt-5 compact:p-6" aria-labelledby="gb-batch-title">
      <div class="flex flex-wrap items-start justify-between gap-3"><div><h2 id="gb-batch-title" class="m-0 text-xl font-bold text-ink">文本 → 逐字符结果</h2><p class="mt-2 mb-0 text-sm leading-relaxed text-body">空格、英文和标点会保留并标注类型；不支持字符仍会保留在结果中。</p></div></div>
      <form class="mt-5" @submit.prevent="convertBatch">
        <label for="gb-batch" class="sr-only">批量文本</label>
        <textarea id="gb-batch" v-model="batchInput" class="min-h-32 w-full resize-y rounded-xl border border-transparent bg-soft px-4 py-3 text-base leading-relaxed text-ink outline-none transition-all placeholder:text-muted focus:border-accent/40 focus:ring-2 focus:ring-accent/30" maxlength="2000" placeholder="输入要检查的文本，例如：中国 A-1" />
        <div class="mt-3 flex flex-wrap items-center justify-between gap-3"><span class="text-xs text-body">{{ batchInput.length }} / 2000</span><n-button attr-type="submit" type="primary"><Search :size="16" aria-hidden="true" />开始转换</n-button></div>
      </form>
      <Gb2312Batch :result="batchResult" :rows="batchRows" @copy="copy" />
    </section>

    <p class="mt-5 mb-0 text-xs leading-relaxed text-body">说明：GB 2312 区位码适用于收录字符；ASCII 字符采用 ASCII 编码展示，其他字符会明确标记为未收录。查询在当前设备本地完成。</p>
  </NavigationShell>
</template>
