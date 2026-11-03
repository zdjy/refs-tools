import { computed, ref } from 'vue'
import { createGb2312Codec } from '@refs-tools/domain'

const decoder = new TextDecoder('gb2312', { fatal: true })
const codec = createGb2312Codec(decoder)

/** 管理区位码工具的临时查询和批量转换状态，不持久化输入或结果。 */
export function useGb2312() {
  const characterInput = ref('中')
  const codeInput = ref('5448')
  const batchInput = ref('中国 A')
  const characterResult = ref(codec.lookupCharacter(characterInput.value))
  const codeResult = ref(codec.lookupCode(codeInput.value))
  const batchResult = ref(codec.convertText(batchInput.value))
  const copiedLabel = ref('')

  const batchRows = computed(() => batchResult.value.items.filter((item) => item.status !== 'invalid'))

  function lookupCharacter() {
    characterResult.value = codec.lookupCharacter(characterInput.value)
  }

  function lookupCode() {
    codeResult.value = codec.lookupCode(codeInput.value)
  }

  function convertBatch() {
    batchResult.value = codec.convertText(batchInput.value)
  }

  function clearAll() {
    characterInput.value = ''
    codeInput.value = ''
    batchInput.value = ''
    characterResult.value = codec.lookupCharacter('')
    codeResult.value = codec.lookupCode('')
    batchResult.value = codec.convertText('')
    copiedLabel.value = ''
  }

  async function copy(label: string, value: string | undefined) {
    if (!value || !navigator.clipboard) return
    await navigator.clipboard.writeText(value)
    copiedLabel.value = label
    window.setTimeout(() => {
      if (copiedLabel.value === label) copiedLabel.value = ''
    }, 1600)
  }

  return {
    characterInput, codeInput, batchInput, characterResult, codeResult, batchResult, batchRows, copiedLabel,
    lookupCharacter, lookupCode, convertBatch, clearAll, copy,
  }
}
