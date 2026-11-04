# ADR 0029：品牌资源归属与图标生成流水线

- 状态：已接受
- 关联：[UI 基线](../ui/macos_fiba.md)、[ADR 0020](./0020-macos-vibrancy-ui-baseline.md)、[FS-0001](../specs/0001-mvp-scope-and-business-rules.md)

## 背景

项目此前没有品牌资源约定：根目录 `logo/` 存放设计过程稿，裁判端 `index.html` 只有 `theme-color`，没有 favicon、apple-touch-icon 或 PWA 清单，`apps/referee-web` 也没有 `public/` 目录。

清点 `logo/` 时发现三类问题：

1. 7 个文件里有 5 个扩展名是 `.png`、内容却是 JPEG（magic bytes `ffd8ffe0`）。若直接发布，manifest 声明 `type: "image/png"` 与实际内容不符。
2. 一个文件是把透明预览的棋盘格当作真实像素导出的截图（背景在 `#CFCFCC` 与 `#F6F5F3` 之间交替），无法使用。
3. 一个文件是另一份素材的黑底压平副本（像素均差约 1.8），属于冗余。

同时，方形盾徽母版的主体只占画布 54%×66%，直接缩放成主屏图标会明显偏小；底色 `#F6F5F1` 与 UI 画布 token `#FAF8F5` 不相等，图标与状态栏拼接会露出色边。

## 决策

1. **母版与派生分离。** `logo/` 只保存设计母版，不参与构建、不进产物；裁判端实际发布的图标全部由 `scripts/brand-icons.mjs`（`pnpm brand:icons`）从母版生成，可重复执行且结果稳定。
2. **按引用方式决定派生文件位置。** 由 `index.html`、manifest 以固定 URL 引用的文件放 `apps/referee-web/public/`（`favicon.ico`、`apple-touch-icon.png`、`manifest.webmanifest`、`icons/`）；页面内使用、需要打包换肤的横版组合标放 `apps/referee-web/src/assets/brand/`，未被引用时不进产物。
3. **底色与画布同源。** 脚本从 `apps/referee-web/src/ui-tokens.ts` 读取 `canvas` token 作为图标底色，不重复硬编码色值；母版自带底色先按四角洪水填充抹除，再铺 token 底色，避免出现两种暖白拼接。

   页面内的品牌标识一律透明底：裁判端页头用横版组合标，管理端侧边栏用方形标。底色来自母版本身，若带着母版的暖白方块贴到不同底色上会出现色边。
4. **格式保持 PNG，不引入 WebP/AVIF/SVG。** iOS 不支持 WebP 作为 `apple-touch-icon`，manifest 图标的 `type` 声明也容易失效；图标量化后仅数 KB，换格式收益接近零。当前没有矢量母版，位图描边转 SVG 只会放大体积并保留模糊。
5. **尺寸规则固定。** 常规图标主体占画布高度 80%；`maskable` 按居中直径 80% 的安全圆反推为 60%，底色铺满整块画布；`apple-touch-icon` 必须不透明（iOS 会把透明区填黑）；`favicon.ico` 按 16/32/48 分别渲染后打包，避免缩放糊掉细线。
6. **母版做去噪与量化。** 母版曾以 JPEG 保存，平面色块上的压缩噪点会让 PNG 无法有效压缩；脚本在原始分辨率上做 3×3 中值滤波（已透明的母版跳过，防止腐蚀 alpha 边缘），输出统一走 256 色调色板量化。
7. **页头用紧凑版组合标。** 母版中盾徽高度约为主标题的 3.3 倍，直接缩到 32–40px 时主标题只剩 10px 上下，且两行副标题会压成 5px 以下的灰糊。脚本裁掉副标题、保留盾徽与「裁衡 RefScope」，并把盾徽缩到 62%，主标题回到 15–20px，与导航文字同量级。该比例由 `COMPACT_SHIELD_SCALE` 单一控制，调回 `1` 即恢复母版原始比例。
8. **管理端深浅两版方标。** 深色母版的盾徽外多一圈奶白描边，浅色母版没有；两版都去底后分别用于对应主题，由 `useBrandLogo` 按 `designSetting.darkTheme` 选择。深色版若用浅色版代替，黑描边会溶进深色侧边栏。
9. **命名改为语义化。** `11_qianse.*` → `mark-light-theme-2048.png`，`ch_qianse.*` → `lockup-light-theme-*`，`ch_shense.*` → `lockup-dark-theme-transparent-*`，删除棋盘格截图与黑底副本。
10. **替换模板遗留品牌。** 管理端侧边栏、水平导航与登录页统一改用本产品方标，`websiteConfig.title` 与 `VITE_GLOB_APP_TITLE` 改为「裁判工具箱」/「裁判工具箱 · 管理端」，并删除不再引用的模板 `logo.png`。登录页的模板文案（`loginDesc`、页脚版权行、`login.brandDesc`）属于文案范围，本次未改。

本轮只提供清单与图标，**不引入 service worker**。离线缓存范围受[FS-0001 §8](../specs/0001-mvp-scope-and-business-rules.md)约束（不得缓存答卷、私有媒体与签名 URL），需要独立决策后再实现；因此暂不添加 `apple-mobile-web-app-capable`，避免在无离线能力时诱导添加到主屏。

## 备选方案

- 手工用设计工具导出图标：一次性成本低，但尺寸、留白、底色无法复现，改图后容易漂移。
- 母版直接放进 `public/` 引用：省去构建步骤，但会把 2–3 MB 的过程稿带进产物，且跨 workspace 引用破坏两个 SPA 的独立构建。
- 引入 `vite-plugin-pwa` 自动生成图标：需要额外依赖与虚拟模块，当前还没有 service worker，插件的主要价值（预缓存与更新流程）无法落地。
- 把图标底色固定为母版自带的 `#F6F5F1`：会与 `theme-color`、全局画布产生色差。

## 后果

- 新增开发依赖 `sharp`（仅构建期使用，不进入生产运行时）。`pnpm brand:icons` 一次执行约 1 秒；裁判端产物约 190 KB，管理端约 20 KB。
- 更换品牌时只需替换 `logo/` 母版并重跑脚本，不必手工维护各尺寸图标与深浅两版方标。
- 母版中仍残留早期 JPEG 压缩痕迹；若设计源文件可用，应以矢量或无损源重新导出覆盖 `logo/` 下的对应文件。
- 裁判端开始向可安装 PWA 靠拢，但离线能力仍未交付，安装提示与离线承诺需在 service worker 落地后再一并验收。
