# 品牌母版

本目录只放设计母版，不参与构建、不进入产物。两个前端实际发布的图标与品牌标识由 `pnpm brand:icons`（`scripts/brand-icons.mjs`）生成，规则见 [ADR 0029](../docs/decisions/0029-brand-assets-and-app-icons.md)。

| 文件 | 用途 |
| --- | --- |
| `mark-light-theme-2048.png` | 方形盾徽，浅色底，黑描边。生成 PWA 图标、apple-touch-icon、两个前端的 favicon，以及管理端浅色主题方标。 |
| `mark-dark-theme-2048.png` | 方形盾徽，深色底，盾徽外多一圈奶白描边。生成管理端深色主题方标。 |
| `lockup-light-theme-2752.png` | 横版组合标，白底。脚本按四角洪水填充去底后导出 `lockup-light.png` 与页头用的 `lockup-compact.png`。 |
| `lockup-light-theme-transparent-1024.png` | 横版组合标，已透明，深色字。低分辨率留档，脚本不消费。 |
| `lockup-dark-theme-transparent-2752.png` | 横版组合标，已透明，白色「裁衡」。直接导出 `lockup-dark.png`。 |

生成去向：

- 裁判端 `apps/referee-web/public/`：`favicon.ico`、`apple-touch-icon.png`、`icons/`（PWA 图标）。
- 裁判端 `apps/referee-web/src/assets/brand/`：`lockup-compact.png`（页头）、`lockup-light.png`、`lockup-dark.png`（留档）。
- 管理端 `apps/admin-web/public/`：`favicon.ico`。
- 管理端 `apps/admin-web/src/assets/images/brand/`：`mark-light.png`、`mark-dark.png`（侧边栏、水平导航、登录页方标）。

约束：

- 必须是真正的 PNG（当前 5 个文件已从误命名的 JPEG 重编码）。脚本会校验 magic bytes，扩展名与内容不符时直接报错。
- 不要提交透明预览的棋盘格截图；棋盘格会被当成真实像素。
- 方形母版要保留完整盾徽与足够留白，主体占比、安全区与底色由脚本统一处理。
- 深色方标必须保留奶白描边，否则黑描边在深色侧边栏上会消失。
