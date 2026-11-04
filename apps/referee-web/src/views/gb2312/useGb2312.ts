import { computed, ref } from 'vue'
import { createGb2312Codec } from '@refs-tools/domain'

const decoder = new TextDecoder('gb2312', { fatal: true })
const codec = createGb2312Codec(decoder)

/** 管理区位码工具的临时查询和批量转换状态，不持久化输入或结果。 */
export function useGb2312(clipboard: Pick<Clipboard, 'writeText'> | undefined = globalThis.navigator?.clipboard) {
  const characterInput = ref('中')
  const codeInput = ref('5448')
  const batchInput = ref('中国 A')
  const characterResult = ref(codec.lookupCharacter(characterInput.value))
  const codeResult = ref(codec.lookupCode(codeInput.value))
  const batchResult = ref(codec.convertText(batchInput.value))
  const copiedLabel = ref('')
  const copyError = ref('')
  const copyNotice = ref('')
  const copying = ref(false)

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
    copiedLabel.value = ''; copyError.value = ''; copyNotice.value = ''
  }

  async function copy(label: string, value: string | undefined) {
    if (!value || copying.value) return
    copiedLabel.value = ''; copyError.value = ''; copyNotice.value = ''
    if (!clipboard) { copyError.value = '当前浏览器不支持复制，请手动选择结果并复制。'; return }
    copying.value = true
    try {
      await clipboard.writeText(value)
      copiedLabel.value = label
      const name = label === 'character' ? '字符' : label === 'batch' ? '转换结果' : label
      copyNotice.value = `${name}已复制。`
    } catch { copyError.value = '复制失败，请检查浏览器剪贴板权限后重试，或手动选择结果并复制。' }
    finally { copying.value = false }
  }

  return {
    characterInput, codeInput, batchInput, characterResult, codeResult, batchResult, batchRows, copiedLabel, copyError, copyNotice, copying,
    lookupCharacter, lookupCode, convertBatch, clearAll, copy,
  }
}
