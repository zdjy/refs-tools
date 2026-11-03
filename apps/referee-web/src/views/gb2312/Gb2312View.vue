<script setup lang="ts">
import { NButton } from 'naive-ui'
import { Eraser, Search } from '@lucide/vue'
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import Gb2312Batch from './components/Gb2312Batch.vue'
import Gb2312Result from './components/Gb2312Result.vue'
import { useGb2312 } from './useGb2312'

const {
  characterInput, codeInput, batchInput, characterResult, codeResult, batchResult, batchRows, copiedLabel,
  lookupCharacter, lookupCode, convertBatch, clearAll, copy,
} = useGb2312()
</script>

<template>
  <NavigationShell>
    <header class="rounded-2xl bg-sand p-6 compact:p-8" aria-labelledby="gb2312-title">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="mt-0 mb-3 text-xs font-bold tracking-wider text-red-hover uppercase">本地工具 · Beta</p>
          <h1 id="gb2312-title" class="m-0 text-3xl font-bold tracking-tight text-ink">GB 2312 区位码工具</h1>
          <p class="mt-4 mb-0 max-w-[720px] text-base leading-relaxed text-body">查询汉字区位码、国标码与十六进制机内码，也可以批量检查文本。ASCII 字符单独标记，未收录字符不会被强行转换。</p>
        </div>
        <n-button secondary @click="clearAll"><Eraser :size="16" aria-hidden="true" />清空</n-button>
      </div>
    </header>

    <section class="mt-6 grid grid-cols-1 gap-4 tablet:grid-cols-2" aria-label="单字符查询">
      <article class="rounded-xl border border-solid border-line bg-surface p-5 shadow-card compact:p-6">
        <div><p class="m-0 text-xs font-bold uppercase tracking-wider text-red-hover">字符 → 编码</p><h2 class="mt-2 mb-0 text-xl font-bold text-ink">查询字符</h2><p class="mt-2 mb-0 text-sm leading-relaxed text-body">输入一个汉字、英文、数字或符号。</p></div>
        <form class="mt-5" @submit.prevent="lookupCharacter">
          <label for="gb-character" class="sr-only">待查询字符</label>
          <div class="flex flex-col gap-3 compact:flex-row"><input id="gb-character" v-model="characterInput" class="min-h-12 min-w-0 flex-1 rounded-xl border border-transparent bg-soft px-4 text-lg text-ink outline-none transition-all placeholder:text-muted focus:border-red/40 focus:ring-2 focus:ring-red/30" maxlength="2" autocomplete="off" placeholder="例如：中" /><n-button attr-type="submit" type="primary"><Search :size="16" aria-hidden="true" />查询</n-button></div>
        </form>
        <Gb2312Result :result="characterResult" @copy="copy" />
      </article>

      <article class="rounded-xl border border-solid border-line bg-surface p-5 shadow-card compact:p-6">
        <div><p class="m-0 text-xs font-bold uppercase tracking-wider text-red-hover">区位码 → 字符</p><h2 class="mt-2 mb-0 text-xl font-bold text-ink">反查区位码</h2><p class="mt-2 mb-0 text-sm leading-relaxed text-body">输入 4 位区位码，例如“5448”对应“中”。</p></div>
        <form class="mt-5" @submit.prevent="lookupCode">
          <label for="gb-code" class="sr-only">四位区位码</label>
          <div class="flex flex-col gap-3 compact:flex-row"><input id="gb-code" v-model="codeInput" class="min-h-12 min-w-0 flex-1 rounded-xl border border-transparent bg-soft px-4 font-mono text-lg tracking-wider text-ink outline-none transition-all placeholder:text-muted focus:border-red/40 focus:ring-2 focus:ring-red/30" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="例如：5448" /><n-button attr-type="submit" type="primary"><Search :size="16" aria-hidden="true" />反查</n-button></div>
        </form>
        <Gb2312Result :result="codeResult" @copy="copy" />
      </article>
    </section>

    <section class="mt-4 rounded-xl border border-solid border-line bg-surface p-5 shadow-card compact:p-6" aria-labelledby="gb-batch-title">
      <div class="flex flex-wrap items-start justify-between gap-3"><div><p class="m-0 text-xs font-bold uppercase tracking-wider text-red-hover">文本 → 逐字符结果</p><h2 id="gb-batch-title" class="mt-2 mb-0 text-xl font-bold text-ink">批量转换</h2><p class="mt-2 mb-0 text-sm leading-relaxed text-body">空格、英文和标点会保留并标注类型；不支持字符仍会保留在结果中。</p></div><span v-if="copiedLabel" class="text-sm text-green" role="status">已复制</span></div>
      <form class="mt-5" @submit.prevent="convertBatch">
        <label for="gb-batch" class="sr-only">批量文本</label>
        <textarea id="gb-batch" v-model="batchInput" class="min-h-32 w-full resize-y rounded-xl border border-transparent bg-soft px-4 py-3 text-base leading-relaxed text-ink outline-none transition-all placeholder:text-muted focus:border-red/40 focus:ring-2 focus:ring-red/30" maxlength="2000" placeholder="输入要检查的文本，例如：中国 A-1" />
        <div class="mt-3 flex flex-wrap items-center justify-between gap-3"><span class="text-xs text-body">{{ batchInput.length }} / 2000</span><n-button attr-type="submit" type="primary"><Search :size="16" aria-hidden="true" />开始转换</n-button></div>
      </form>
      <Gb2312Batch :result="batchResult" :rows="batchRows" @copy="copy" />
    </section>

    <p class="mt-5 mb-0 text-xs leading-relaxed text-body">说明：GB 2312 区位码适用于收录字符；ASCII 字符采用 ASCII 编码展示，其他字符会明确标记为未收录。查询在当前设备本地完成。</p>
  </NavigationShell>
</template>
