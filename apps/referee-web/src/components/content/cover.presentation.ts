import type { CoverMotif } from '../../content/editorial'

/** 图形元素角色，对应固定的静态类名；颜色全部来自语义 token，不使用渐变。 */
export type CoverPartKind = 'line' | 'dash' | 'fill' | 'accent' | 'pale'

export interface CoverPart { kind: CoverPartKind; d: string }

export const coverPartClass: Record<CoverPartKind, string> = {
  line: 'fill-none stroke-ink',
  dash: 'fill-none stroke-ink',
  fill: 'fill-ink',
  accent: 'fill-accent',
  pale: 'fill-surface',
}

const dot = (x: number, y: number, r: number) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`

/** 十种母题的几何构图，坐标系 400×300；仅表达关系与结构，不代表标准站位或规则图示。 */
export const coverMotifs: Record<CoverMotif, readonly CoverPart[]> = {
  sightline: [
    { kind: 'line', d: 'M70 40H330V260H70ZM70 150H330' }, { kind: 'line', d: dot(200, 150, 32) },
    { kind: 'dash', d: 'M115 225L200 110L292 180' }, { kind: 'accent', d: dot(200, 110, 11) },
    { kind: 'fill', d: `${dot(115, 225, 5)}${dot(292, 180, 5)}` },
  ],
  ruleset: [
    { kind: 'pale', d: 'M120 60H300V250H120Z' }, { kind: 'line', d: 'M120 60H300V250H120ZM150 100H270M150 130H270M150 160H230' },
    { kind: 'line', d: 'M140 40H320V230' }, { kind: 'accent', d: 'M150 200H210V214H150Z' },
  ],
  briefing: [
    { kind: 'line', d: dot(130, 150, 46) }, { kind: 'line', d: dot(270, 150, 46) },
    { kind: 'dash', d: 'M176 150H224' }, { kind: 'accent', d: dot(200, 150, 10) },
    { kind: 'fill', d: `${dot(130, 150, 6)}${dot(270, 150, 6)}` },
  ],
  table: [
    { kind: 'pale', d: 'M80 150H320V220H80Z' }, { kind: 'line', d: 'M80 150H320V220H80ZM130 150V220M270 150V220' },
    { kind: 'fill', d: 'M100 110H150V140H100ZM250 110H300V140H250Z' }, { kind: 'accent', d: 'M180 100H220V140H180Z' },
  ],
  terms: [
    { kind: 'pale', d: 'M80 80H210V170H80Z' }, { kind: 'line', d: 'M80 80H210V170H80Z' },
    { kind: 'pale', d: 'M170 130H320V220H170Z' }, { kind: 'line', d: 'M170 130H320V220H170ZM190 160H280M190 185H250' },
    { kind: 'accent', d: 'M100 100H150V108H100Z' },
  ],
  speech: [
    { kind: 'pale', d: 'M80 70H320V190H190L140 235V190H80Z' }, { kind: 'line', d: 'M80 70H320V190H190L140 235V190H80ZM115 110H285M115 140H235' },
    { kind: 'accent', d: dot(285, 140, 9) },
  ],
  overlap: [
    { kind: 'line', d: dot(160, 150, 74) }, { kind: 'line', d: dot(240, 150, 74) },
    { kind: 'pale', d: 'M200 90a74 74 0 0 1 0 120a74 74 0 0 1 0 -120Z' }, { kind: 'accent', d: dot(200, 150, 12) },
  ],
  notes: [
    { kind: 'pale', d: 'M110 50H290V250H110Z' }, { kind: 'line', d: 'M110 50H290V250H110ZM160 100H260M160 140H260M160 180H220' },
    { kind: 'accent', d: 'M130 96H148V114H130Z' }, { kind: 'fill', d: 'M130 136H148V154H130ZM130 176H148V194H130Z' },
  ],
  mismatch: [
    { kind: 'fill', d: 'M100 200H140V110H100ZM160 200H200V80H160Z' }, { kind: 'pale', d: 'M220 200H260V110H220Z' },
    { kind: 'line', d: 'M220 200H260V110H220Z' }, { kind: 'accent', d: 'M280 200H320V150H280Z' },
    { kind: 'line', d: 'M80 214H340' },
  ],
  steps: [
    { kind: 'pale', d: 'M70 230H150V190H70Z' }, { kind: 'pale', d: 'M150 230H230V150H150Z' }, { kind: 'pale', d: 'M230 230H310V110H230Z' },
    { kind: 'line', d: 'M70 230H150V190H70ZM150 230H230V150H150ZM230 230H310V110H230Z' }, { kind: 'accent', d: dot(270, 86, 12) },
  ],
}
