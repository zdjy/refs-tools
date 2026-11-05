import { ClipboardList, Layers, NotebookPen, ScanLine, Sprout } from '@lucide/vue'

/** 版块图标：桌面胶囊与手机抽屉共用，避免两处各维护一份映射。 */
export const boardIcons = { all: Layers, 'case-review': ScanLine, 'field-notes': NotebookPen, 'table-work': ClipboardList, 'rookie-notes': Sprout }
