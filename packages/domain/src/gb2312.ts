export type Gb2312LookupStatus = 'gb2312' | 'ascii' | 'unsupported' | 'invalid'
export type Gb2312Reason = 'multiple-characters' | 'invalid-code' | 'not-in-gb2312'

export interface Gb2312Decoder {
  decode(input: Uint8Array): string
}

export interface Gb2312CodeFields {
  zoneCode: string
  nationalCode: string
  machineCode: string
  zoneRow: number
  zoneColumn: number
}

export interface Gb2312CharacterResult {
  input: string
  status: Gb2312LookupStatus
  reason?: Gb2312Reason
  codePoint?: string
  asciiCode?: number
  asciiHex?: string
  character?: string
  fields?: Gb2312CodeFields
}

export interface Gb2312BatchResult {
  input: string
  items: readonly Gb2312CharacterResult[]
  gb2312Count: number
  asciiCount: number
  unsupportedCount: number
}

const MIN_BYTE = 0xA1
const MAX_BYTE = 0xF7
const MIN_ROW = 1
const MAX_ROW = 87
const MIN_COLUMN = 1
const MAX_COLUMN = 94

function isGb2312Row(row: number): boolean {
  return (row >= 1 && row <= 9) || (row >= 16 && row <= MAX_ROW)
}

function isValidZone(row: number, column: number): boolean {
  return row >= MIN_ROW && row <= MAX_ROW && isGb2312Row(row) && column >= MIN_COLUMN && column <= MAX_COLUMN
}

function toHex(value: number): string {
  return value.toString(16).toUpperCase().padStart(2, '0')
}

function createCodeFields(row: number, column: number): Gb2312CodeFields {
  const firstByte = row + 0xA0
  const secondByte = column + 0xA0
  return {
    zoneCode: `${row.toString().padStart(2, '0')}${column.toString().padStart(2, '0')}`,
    nationalCode: `${toHex(row + 0x20)}${toHex(column + 0x20)}`,
    machineCode: `${toHex(firstByte)}${toHex(secondByte)}`,
    zoneRow: row,
    zoneColumn: column,
  }
}

function invalidResult(input: string, reason: Gb2312Reason): Gb2312CharacterResult {
  return { input, status: 'invalid', reason }
}

function characterResult(character: string, fields: Gb2312CodeFields): Gb2312CharacterResult {
  return { input: character, status: 'gb2312', character, codePoint: `U+${character.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`, fields }
}

function asciiResult(character: string): Gb2312CharacterResult {
  const code = character.codePointAt(0)!
  return {
    input: character,
    status: 'ascii',
    character,
    codePoint: `U+${code.toString(16).toUpperCase().padStart(4, '0')}`,
    asciiCode: code,
    asciiHex: toHex(code),
  }
}

function unsupportedResult(character: string): Gb2312CharacterResult {
  const code = character.codePointAt(0)!
  return {
    input: character,
    status: 'unsupported',
    reason: 'not-in-gb2312',
    character,
    codePoint: `U+${code.toString(16).toUpperCase().padStart(4, '0')}`,
  }
}

function decodePair(decoder: Gb2312Decoder, row: number, column: number): string | null {
  try {
    const decoded = decoder.decode(Uint8Array.of(row + 0xA0, column + 0xA0))
    return Array.from(decoded).length === 1 && decoded !== '\uFFFD' ? decoded : null
  } catch {
    return null
  }
}

function buildReverseIndex(decoder: Gb2312Decoder): Map<string, Gb2312CodeFields> {
  const index = new Map<string, Gb2312CodeFields>()
  for (let row = MIN_BYTE - 0xA0; row <= MAX_BYTE - 0xA0; row += 1) {
    if (!isGb2312Row(row)) continue
    for (let column = MIN_COLUMN; column <= MAX_COLUMN; column += 1) {
      const character = decodePair(decoder, row, column)
      if (character && !index.has(character)) index.set(character, createCodeFields(row, column))
    }
  }
  return index
}

/** 创建 GB 2312 双向查询器；解码器由调用方注入，领域层因此不依赖浏览器或 Node 编码 API。 */
export function createGb2312Codec(decoder: Gb2312Decoder) {
  const reverseIndex = buildReverseIndex(decoder)

  function lookupCharacter(input: string): Gb2312CharacterResult {
    const characters = Array.from(input)
    if (characters.length !== 1) return invalidResult(input, 'multiple-characters')
    const character = characters[0]!
    const code = character.codePointAt(0)!
    if (code <= 0x7F) return asciiResult(character)
    const fields = reverseIndex.get(character)
    return fields ? characterResult(character, fields) : unsupportedResult(character)
  }

  function lookupCode(input: string): Gb2312CharacterResult {
    const normalized = input.trim()
    if (!/^\d{4}$/.test(normalized)) return invalidResult(input, 'invalid-code')
    const row = Number(normalized.slice(0, 2))
    const column = Number(normalized.slice(2))
    if (!isValidZone(row, column)) return invalidResult(input, 'invalid-code')
    const character = decodePair(decoder, row, column)
    if (!character) return invalidResult(input, 'not-in-gb2312')
    return characterResult(character, createCodeFields(row, column))
  }

  function convertText(input: string): Gb2312BatchResult {
    const items = Array.from(input, lookupCharacter)
    return {
      input,
      items,
      gb2312Count: items.filter((item) => item.status === 'gb2312').length,
      asciiCount: items.filter((item) => item.status === 'ascii').length,
      unsupportedCount: items.filter((item) => item.status === 'unsupported' || item.status === 'invalid').length,
    }
  }

  return { lookupCharacter, lookupCode, convertText }
}

export type Gb2312Codec = ReturnType<typeof createGb2312Codec>
