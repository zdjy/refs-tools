# macOS 毛玻璃设计规范（FIBA 暖沙金机构配色版）

style_slug: macos-vibrancy-fiba

> 设计说明：本规范将 macOS 原生桌面应用的层级架构与毛玻璃（Vibrancy）通透感，同 FIBA 官方机构（about.fiba.basketball）权威典雅的暖沙金视觉基调全面融合。通过浅暖白全局画布、纯白悬浮表面、暖沙金特征区块与篮球场红点缀，构筑温润、克制且具权威感的现代化界面。

---

## 什么时候用

- 统一团队与 AI 对“macOS 架构 + FIBA 暖沙金配色”的跨界风格认知。
- 任务交付前端或生成代码前，约束色彩、半透明模糊、边框及组件层级的边界。
- 代码审查与 UI 验收时，判定产出物是否同时保持了桌面应用的架构严谨性与暖沙金的典雅观感。

## 怎么用

- **概览与视觉系统**：提取色板 Token、毛玻璃模糊度与对比度层级。
- **布局与组件规则**：严格参照多面板、1px 暖调边框及胶囊/微圆角的尺寸边界开发。
- **对比与模板**：对照错误/正确代码片段与布局骨架快速搭建应用。
- **交付检查**：上线前逐条核验禁止项与合规清单。

---

## 概览

以 macOS 原生毛玻璃架构为骨骼，注入 FIBA 官方典藏色彩。摒弃传统桌面暗色毛玻璃的冷灰与蓝黑基调，以暖白与沙金为基础，利用系统级 `backdrop-blur`、高反差炭黑排印、极低透明度暖调投影与球场红视线引导，呈现兼具 Apple 极简呼吸感与国际体育组织权威性的视觉体验。

## 设计意图

macOS Vibrancy 的核心在于**克制与景深**，而 FIBA 机构版的核心在于**石质、枫木与典雅权威**。二者融合旨在消除冷感科技的单调，在保持清晰窗格与毛玻璃层次的同时，赋予界面温暖通透、沉稳克制的人文质感。

---

## 视觉系统（Color Tokens & Styles）

### 1. 色彩映射字典

| 角色分类 | 语义 Token | 色值 / Tailwind Class | 场景说明 |
| :--- | :--- | :--- | :--- |
| **画布底层** | Canvas Base | `#FAF8F5` (`bg-[#FAF8F5]`) | 窗口底板、全局背景画布 |
| **次级表面** | Surface Secondary | `#F5F2EB` (`bg-[#F5F2EB]`) | 侧边栏、表单输入框、次级面板底色 |
| **特征焦块** | Surface Focus | `#EBE4D8` (`bg-[#EBE4D8]`) | 特征激活区、重点信息 Banner、高亮卡片 |
| **折面暗色** | Surface Facet | `#DDD4C5` (`bg-[#DDD4C5]`) | 几何切角折面、局部景深切片 |
| **悬浮面板** | Card / Popover | `#FFFFFF` (`bg-white`) | 内容主卡片、弹出菜单、模态窗主体 |
| **主标题色** | Text Primary | `#111111` (`text-[#111111]`) | 标题、强调文本、关键图标、主操作文字 |
| **正文描述** | Text Secondary | `#635E57` (`text-[#635E57]`) | 列表正文、段落说明、辅助描述 |
| **弱化辅助** | Text Muted | `#8C867E` (`text-[#8C867E]`) | 标签副文本、时间戳、占位符 (Placeholder) |
| **暖调边框** | Border Default | `#E2DDD5` (`border-[#E2DDD5]`) | 1px 细分割线、卡片描边、面板分界线 |
| **球场红** | Accent Primary | `#D83A1E` (`#BA2F17` hover) | 核心强调色、交互激活态、关键指示 |
| **荣耀金** | Accent Gold | `#D4A017` | 特权标签、认证角标、奖牌微标 |
| **正向绿** | Accent Green | `#1B8754` | 合规状态、正常运行、成功反馈 |

### 2. 毛玻璃与微阴影规范

- **毛玻璃侧边栏**：`backdrop-blur-xl bg-[#FAF8F5]/85` 或 `backdrop-blur-xl bg-[#F5F2EB]/80`
- **毛玻璃顶栏/控制栏**：`backdrop-blur-md bg-[#FAF8F5]/90 border-b border-[#E2DDD5]`
- **暖调微阴影**：
  - 微层卡片：`shadow-[0_2px_8px_rgba(27,22,16,0.03)]`
  - 浮雕主卡片：`shadow-[0_4px_16px_rgba(27,22,16,0.05)]`
  - 悬停浮升：`hover:shadow-[0_12px_32px_rgba(27,22,16,0.08)]`

---

## 布局规则

- **区块节奏**：标准内间距 `py-12 md:py-16`，局部紧凑工具栏 `py-3 px-4`
- **面板内边距**：侧边栏 `p-4 md:p-6`，主体内容区 `p-6 md:p-8`
- **卡片内边距**：`p-4 md:p-6`（紧凑卡片）或 `p-6 md:p-8`（宽景卡片）
- **网格间距**：`gap-4`（桌面列表/控制项）至 `gap-6`（卡片网格）
- **圆角规范**：
  - 应用窗口与主容器：`rounded-2xl`
  - 内部面板与卡片：`rounded-xl`
  - 按钮：`rounded-full`（遵循 FIBA 胶囊规范）
  - 输入框与小控件：`rounded-xl`

---

## 组件规则

### 1. 窗口与面板分层（Three-Layer Surface）
- **底层（Window Canvas）**：`bg-[#FAF8F5]` 全局铺底。
- **次层（Sidebar / Inspector）**：使用 `bg-[#F5F2EB]/80 backdrop-blur-xl border-r border-[#E2DDD5]`，强化桌面应用透视。
- **顶层（Main Content Area）**：使用纯白卡片 `bg-white border border-[#E2DDD5]` 悬浮排列，或重点放置暖沙金焦点区 `bg-[#EBE4D8]`。

### 2. 侧边栏与导航项（Sidebar & Navigation）
- 宽度固定或自适应，带 1px 暖调右边框：`border-r border-[#E2DDD5]`。
- **默认导航项**：`text-[#635E57] hover:bg-[#F5F2EB] hover:text-[#111111] transition-colors duration-200 rounded-lg px-3 py-2 text-sm`。
- **激活导航项**：`bg-[#EBE4D8] text-[#111111] font-semibold shadow-[0_1px_3px_rgba(27,22,16,0.04)]`。激活指示点或前缀小竖线使用 `#D83A1E`。

### 3. 操作按钮（Buttons）
- **主要操作**：胶囊外形 `rounded-full`，炭黑底色 `bg-[#111111] hover:bg-black text-white font-medium active:scale-95 transition-all text-xs md:text-sm px-5 py-2`。
- **次要操作**：`rounded-full bg-[#F5F2EB] hover:bg-[#E2DDD5] text-[#111111] font-medium border border-[#E2DDD5]/60 active:scale-95 transition-all text-xs md:text-sm px-5 py-2`。
- **强调操作**：`rounded-full bg-[#D83A1E] hover:bg-[#BA2F17] text-white font-medium active:scale-95 transition-all text-xs md:text-sm px-5 py-2`。

### 4. 输入框与控制控件（Inputs & Controls）
- 底色采用浅沙灰：`bg-[#F5F2EB] border border-transparent text-[#111111] placeholder-[#8C867E] rounded-xl px-3.5 py-2 text-sm`。
- 聚焦状态：`focus:outline-none focus:ring-2 focus:ring-[#D83A1E]/30 focus:border-[#D83A1E]/40`。

### 5. 代码块与数据展示（Code & Monospace）
- 背景为浅沙色 `bg-[#F5F2EB]`，配 1px 暖边框 `border border-[#E2DDD5]`，文字为深色 `text-[#111111] font-mono text-xs`。
- 反白深色控制台（仅限特定终端组件）：`bg-[#111111] text-[#FAF8F5] rounded-xl p-4 font-mono text-xs border border-[#E2DDD5]/20`。

---

## 交互与动效

- **过渡时间**：严格保持短促克制，主过渡统一为 `transition-all duration-200 ease-out`。
- **触感回弹（Haptic Touch）**：所有可点按元素具备轻微物理按压反馈：`active:scale-[0.98]` 或 `active:scale-95`。
- **卡片悬停**：卡片悬停仅提升投影并微幅抬升，严禁夸张漂浮；内部缩略图限制在 `group-hover:scale-105 transition-transform duration-500`。
- **动效禁令**：动效不得引发布局位移（Layout Shift），严禁无意义的跳跃、摇摆或闪烁。

---

## 可访问性（Accessibility）

- **对比度标准**：正文使用 `#635E57`、标题使用 `#111111`，在 `#FAF8F5`、`#F5F2EB` 与纯白背景上均满足 WCAG AA 以上的对比度要求。
- **焦点环管理**：严禁移除原生焦点样式而不做补偿，所有交互元素必须提供 `focus:ring-2 focus:ring-[#D83A1E]/30` 键盘焦点引导。
- **移动端与触控**：交互点击区域保持不小于 44px $\times$ 44px。
- **减弱动态**：全面支持 `@media (prefers-reduced-motion: reduce)`，关闭过渡与形变效果。

---

## [FORBIDDEN] 绝对禁止

- ❌ **严禁使用任何彩色渐变背景**（绝对禁止 `bg-gradient-*`，必须使用 Solid 纯色）。
- ❌ **严禁冷灰或冷蓝黑系背景**（彻底移除 `#1c1c1e`、`#2c2c2e`、`#3a3a3c`、`#0a84ff` 等旧暗色 macOS 色值）。
- ❌ **严禁厚重阴影与发光**（禁止 `shadow-2xl`，禁止霓虹发光）。
- ❌ **严禁非规范边框**（边框厚度禁止大于 1px，严禁使用粗线 `border-2`, `border-4`）。
- ❌ **严禁装饰性跳动动画**（禁止使用 `animate-bounce`, `animate-pulse`, `animate-spin` 进行页面级装饰）。
- ❌ **严禁低对比度排印**（严禁在 `#EBE4D8` 暖沙金底色上使用淡灰字或纯白无描边字）。

---

## [COMPARE] 错误 vs 正确对比

### 1. 桌面侧边栏与毛玻璃实现

**[WRONG] 错误示例**（旧冷黑暗色、带蓝渐变与厚重阴影）：
```html
<aside class="w-64 bg-[#1c1c1e]/80 backdrop-blur-xl border-r border-white/10 text-white shadow-2xl">
  <div class="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
    <span class="text-white font-bold">工作台</span>
  </div>
</aside>
```

**[CORRECT] 正确示例**（FIBA 暖沙金机构版毛玻璃）：
```html
<aside class="w-64 bg-[#FAF8F5]/85 backdrop-blur-xl border-r border-[#E2DDD5] flex flex-col p-4">
  <div class="px-3 py-2 mb-4 flex items-center justify-between">
    <span class="text-xs font-bold uppercase tracking-wider text-[#D83A1E]">FIBA Desk</span>
    <span class="w-2 h-2 rounded-full bg-[#1B8754]"></span>
  </div>
  <nav class="space-y-1">
    <a class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium bg-[#EBE4D8] text-[#111111] transition-all">
      <span class="w-1.5 h-1.5 rounded-full bg-[#D83A1E]"></span>
      赛事纪要
    </a>
    <a class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-[#635E57] hover:bg-[#F5F2EB] hover:text-[#111111] transition-colors">
      技术规程
    </a>
  </nav>
</aside>
```

### 2. 按钮组件

**[WRONG] 错误示例**（方角、渐变、强发光）：
```html
<button class="bg-gradient-to-r from-red-600 to-orange-500 hover:shadow-lg text-white font-bold px-4 py-2 rounded-md">
  导出报告
</button>
```

**[CORRECT] 正确示例**（FIBA 炭黑/胶囊高反差按钮）：
```html
<button class="rounded-full bg-[#111111] hover:bg-black text-white text-xs md:text-sm font-medium px-5 py-2 active:scale-95 transition-all shadow-[0_2px_8px_rgba(27,22,16,0.06)]">
  导出报告
</button>
```

---

## [TEMPLATES] 典型桌面窗口模板

```html
<!-- 主应用窗口容器 -->
<div class="min-h-screen bg-[#FAF8F5] text-[#111111] flex flex-col antialiased">
  <!-- 顶栏：macOS 交通灯与毛玻璃工具栏 -->
  <header class="h-12 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E2DDD5] px-4 flex items-center justify-between sticky top-0 z-50">
    <div class="flex items-center gap-2">
      <!-- 窗口操作三色微标 -->
      <div class="w-3 h-3 rounded-full bg-[#E2DDD5] border border-[#DDD4C5]"></div>
      <div class="w-3 h-3 rounded-full bg-[#E2DDD5] border border-[#DDD4C5]"></div>
      <div class="w-3 h-3 rounded-full bg-[#E2DDD5] border border-[#DDD4C5]"></div>
      <span class="ml-4 text-xs font-semibold tracking-tight text-[#111111]">裁决控制台 - House of Basketball</span>
    </div>
    <div class="flex items-center gap-3">
      <button class="rounded-full bg-[#F5F2EB] hover:bg-[#E2DDD5] text-[#111111] text-xs font-medium px-3.5 py-1.5 transition-all active:scale-95">
        帮助中心
      </button>
      <button class="rounded-full bg-[#111111] hover:bg-black text-white text-xs font-medium px-4 py-1.5 transition-all active:scale-95">
        签发判定
      </button>
    </div>
  </header>

  <!-- 工作区：侧边栏 + 内容区 -->
  <div class="flex flex-1 overflow-hidden">
    <!-- 侧边栏 -->
    <aside class="w-64 bg-[#F5F2EB]/80 backdrop-blur-xl border-r border-[#E2DDD5] p-4 flex flex-col justify-between hidden md:flex">
      <div>
        <div class="px-3 py-2">
          <span class="text-[11px] font-bold uppercase tracking-wider text-[#D83A1E]">规程模块</span>
        </div>
        <div class="mt-2 space-y-1">
          <button class="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold bg-[#EBE4D8] text-[#111111] flex items-center justify-between">
            <span>竞赛准则</span>
            <span class="text-[10px] font-mono text-[#D83A1E]">DOC-24</span>
          </button>
          <button class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#635E57] hover:bg-[#EBE4D8]/50 hover:text-[#111111] transition-colors">
            装备认证
          </button>
          <button class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#635E57] hover:bg-[#EBE4D8]/50 hover:text-[#111111] transition-colors">
            仲裁归档
          </button>
        </div>
      </div>
      <!-- 底部机构签名信息 -->
      <div class="p-3 border-t border-[#E2DDD5]">
        <p class="text-[11px] font-mono text-[#8C867E]">FIBA Central Board</p>
        <p class="text-[10px] text-[#8C867E]">Mies, Switzerland</p>
      </div>
    </aside>

    <!-- 主展示面板 -->
    <main class="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
      <!-- 特征 In Focus 暖沙金横幅 -->
      <div class="bg-[#EBE4D8] rounded-2xl border border-[#E2DDD5] p-6 relative overflow-hidden">
        <div class="relative z-10 max-w-xl">
          <span class="text-xs font-bold uppercase tracking-wider text-[#D83A1E]">In Focus</span>
          <h2 class="text-2xl font-bold tracking-tight text-[#111111] mt-1">2026 官方执裁标准解析</h2>
          <p class="text-[#635E57] text-xs md:text-sm mt-2 leading-relaxed">
            依据国际篮联技术委员会最新审定细则，强化回放系统在违体犯规判定中的时间窗口基准。
          </p>
        </div>
      </div>

      <!-- 纯白悬浮数据卡片网格 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-white rounded-xl border border-[#E2DDD5] p-5 shadow-[0_2px_8px_rgba(27,22,16,0.03)] hover:shadow-[0_8px_24px_rgba(27,22,16,0.06)] transition-all">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono text-[#8C867E]">SEC 01</span>
            <span class="w-2 h-2 rounded-full bg-[#1B8754]"></span>
          </div>
          <h3 class="text-base font-bold text-[#111111] mt-2">即时回放适用范围</h3>
          <p class="text-xs text-[#635E57] mt-1.5 leading-relaxed">包括最后一投计时判定、界外球归属及对抗性质回溯等六类合法情境。</p>
        </div>

        <div class="bg-white rounded-xl border border-[#E2DDD5] p-5 shadow-[0_2px_8px_rgba(27,22,16,0.03)] hover:shadow-[0_8px_24px_rgba(27,22,16,0.06)] transition-all">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono text-[#8C867E]">SEC 02</span>
            <span class="w-2 h-2 rounded-full bg-[#D4A017]"></span>
          </div>
          <h3 class="text-base font-bold text-[#111111] mt-2">教练挑战规程</h3>
          <p class="text-xs text-[#635E57] mt-1.5 leading-relaxed">主教练必须在死球发生后立即提出申请，每次正式比赛享有一次有效挑战权限。</p>
        </div>
      </div>
    </main>
  </div>
</div>
```

---

## 交付检查清单

- [ ] **底色纯正**：全局画布为浅暖白 `#FAF8F5`，特征高光为暖沙金 `#EBE4D8`，完全清除了冷灰与死黑色值。
- [ ] **毛玻璃效果**：毛玻璃层正确配置了暖调透明度与平滑模糊（如 `backdrop-blur-xl bg-[#FAF8F5]/85`）。
- [ ] **强调色校准**：所有醒目引导色、徽标点缀与高光链接均为球场红 `#D83A1E`，无外部违规蓝色/紫色出现。
- [ ] **零渐变**：所有背景色均为纯色（Solid），代码中检索不出任何 `bg-gradient-*`。
- [ ] **边框与阴影微调**：边框全为 1px `#E2DDD5`，阴影全为极低不透明度的暖色散点投影，无 `shadow-2xl`。
- [ ] **按钮外形**：按钮统一采用胶囊状 `rounded-full` 搭配 `active:scale-95` 物理回弹反馈。
- [ ] **文字对比度**：深色标题文本在纯白与沙金背景上均保持清晰锐利，符合 WCAG AA 标准。