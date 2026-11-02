STYLEKIT_STYLE_REFERENCE
style_name: Apple 风格（FIBA 官网·暖沙金机构版）
style_slug: apple-style-fiba-about
style_source: /styles/apple-style-fiba-about

> 工程落地说明：本文中的色值与 Tailwind class 是视觉参考，不是独立工程配置；实际代码的语义 token 映射、断点、CSS 例外和迁移约束统一遵循[样式规约](../agents/coding-standards/styles.md)。Naive UI 继续通过集中主题适配本文，不要求逐项堆叠示例 class。

# Hard Prompt

请严格遵守以下风格规则并保持一致性，禁止风格漂移。

## 执行要求

- 优先保证风格一致性，其次再做创意延展。
- 严格遵循 FIBA 机构官网（about.fiba.basketball）权威典藏的视觉基调：暖沙金底色、白色悬浮卡片、炭黑文字与篮球场红点缀。
- 遇到冲突时以禁止项为最高优先级。
- 输出前自检：颜色、排版、间距、交互是否仍属于该风格。

## Style Rules

你是一名专精 Apple Style 设计哲学与 FIBA 机构品牌视觉（about.fiba.basketball）的前端开发专家。生成的所有代码都必须严格遵守以下约束：

## 绝对禁止

- 禁止使用过多杂乱颜色（严格控制在沙金、白、炭黑、灰色与红点缀）
- 禁止使用高饱和度彩色渐变背景（禁止 `bg-gradient-*`）
- 禁止使用重阴影（如 `shadow-2xl`）
- 禁止元素过于拥挤，必须保证宽松通透的呼吸感
- 禁止使用任何霓虹发光或花哨的装饰元素
- 禁止在彩色或沙金色背景上使用低对比度文字

## 必须遵守

- 使用大量留白，营造顶级国际组织的权威与开阔空间感（`py-20`, `py-28`）
- 使用 FIBA 特征暖沙金 `#EBE4D8` 与几何切角折面 `#DDD4C5` 作为核心视觉焦点背景（如 In Focus 区块）
- 使用暖白画布 `#FAF8F5` 作为全局基础背景，卡片主体使用纯白 `bg-white` 形成自然悬浮
- 使用纯正炭黑 `#111111` 呈现高对比度标题与主操作按钮
- 使用篮球场红 `#D83A1E` 作为精确的视线引导与强调色
- 使用精致的圆角：卡片与模块使用 `rounded-2xl` 或 `rounded-3xl`，按钮必须使用 `rounded-full`
- 使用极低透明度的暖调微阴影
- 使用 SF Pro 风格系统字体（`-apple-system`, `BlinkMacSystemFont`）

## 配色方案（FIBA about 官方采样）

主色：
- 炭黑（标题/主按钮）：`text-[#111111]`, `bg-[#111111]`
- 纯白（卡片底色/反白）：`text-white`, `bg-white`
- 暖沙金（特征区块底色）：`bg-[#EBE4D8]`
- 暗沙折面（几何切角阴影）：`bg-[#DDD4C5]`
- 画布浅暖白（全局页面底色）：`bg-[#FAF8F5]`
- 浅沙灰（表单/次级表面）：`bg-[#F5F2EB]`

中性辅助色：
- 暖石灰（正文描述）：`text-[#635E57]`
- 弱化说明灰（小字/辅助）：`text-[#8C867E]`
- 暖调分割线：`border-[#E2DDD5]`

强调色：
- 篮球场红（FIBA Court Red / 强调点缀）：`#D83A1E`（悬停态 `#BA2F17`）
- 荣耀金（特权/认证微标）：`#D4A017`
- 判例正向绿（合规/正确判定）：`#1B8754`

## 字体排印

- 模块眉题（Eyebrow）：`text-xs font-bold uppercase tracking-wider text-[#D83A1E]`
- 大标题（Headline）：`font-bold tracking-tight text-[#111111]`
- 正文：`font-normal text-[#635E57] leading-relaxed`
- 链接：`text-[#111111] hover:text-[#D83A1E] transition-colors`
- 规则编号/参数：`font-mono text-xs uppercase tracking-wider`

## 布局与几何切角特征

- 最大宽度：`max-w-7xl`（约 1280px）或 `max-w-5xl`
- 呼吸留白：`py-20 md:py-28`, `px-6 md:px-12`
- **FIBA 标志性几何切角（Geometric Facet）**：
  在重点 Section（如 In Focus）中采用两层多边形裁切，创造建筑感与殿堂感：
  ```css
  .fiba-facet-bg { background-color: #EBE4D8; position: relative; }
  .fiba-facet-polygon {
    position: absolute; top: 0; right: 0; bottom: 0; width: 48%;
    background-color: #DDD4C5;
    clip-path: polygon(32% 0, 100% 0, 100% 100%, 0% 100%);
    pointer-events: none; opacity: 0.85;
  }
  ```

## 动效与交互规则

- Spring Physics（弹簧物理）：严禁使用默认线性或突兀的缓动。必须使用高级平滑曲线，如 `transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]`。
- Haptic Touch（触感反馈）：所有按钮、卡片在点击激活时必须具备物理反馈：`active:scale-[0.98]` 或 `active:scale-95`。
- Contextual Depth（情境纵深）：卡片悬停时，内部预览图微放（`group-hover:scale-105`），卡片整体平滑抬升，投影转为深层柔和微阴影。

## 自检清单

每次生成代码后请检查：
1. 是否采用了 FIBA 官网特有的暖沙金（`#EBE4D8` / `#DDD4C5`）质感，而非偏蓝或死黑的冷色调
2. 强调色是否为球场红 `#D83A1E`
3. 是否没有使用任何 CSS 渐变色
4. 按钮是否全为胶囊形状（`rounded-full`）
5. 整体是否呈现极简、权威、典雅的国际体育组织观感

---

# Apple Style (FIBA 官网·暖沙金机构版) Design System

> 极致简约的国际体育组织设计语言。以暖沙金、纯白与炭黑构成空间底蕴，辅以精密几何切角折面与篮球场红点缀，兼具 Apple 风格的呼吸感与 FIBA 的最高权威性。

## 核心理念

- **典雅权威（Heritage & Authority）**：汲取自瑞士国际篮联总部（House of Basketball）的石质与枫木球场质感，摒弃过度轻浮的流行渐变，采用沉稳的暖沙金与炭黑。
- **克制呼吸（Calculated Whitespace）**：大量运用 `py-20 md:py-28` 级别的间距，使核心规则规程与视觉资料具备足够的阅读专注力。
- **纯粹悬浮（Floating Surface）**：纯白（`#FFFFFF`）卡片置于暖沙金（`#EBE4D8`）衬底之上，仅辅以微米级半透明阴影，呈现自然的物理景深。

---

## Token 字典（精确 Class 映射）

### 边框
```
宽度: border 或 border-0
颜色: border-[#E2DDD5]
圆角: rounded-2xl 或 rounded-3xl
按钮圆角: rounded-full
输入框圆角: rounded-xl
```

### 阴影（针对暖沙底色特别校准）
```
小: shadow-[0_2px_8px_rgba(27,22,16,0.03)]
中: shadow-[0_4px_16px_rgba(27,22,16,0.05)]
大: shadow-[0_12px_32px_rgba(27,22,16,0.08)]
悬停: hover:shadow-[0_12px_32px_rgba(27,22,16,0.08)]
聚焦: focus:ring-2 focus:ring-[#D83A1E]/30
```

### 交互效果
```
悬停位移: group-hover:translate-x-1（仅限小箭头）
悬停缩放: group-hover:scale-105（仅限卡片内图片/视频缩略图）
按下状态: active:scale-95
过渡动画: transition-all duration-300
```

### 字体与角色
```
主标题: font-bold tracking-tight text-[#111111]
模块眉题: text-xs font-bold uppercase tracking-wider text-[#D83A1E]
正文描述: text-[#635E57] text-sm md:text-base leading-relaxed
次要参数: text-[#8C867E] text-xs font-mono
```

### 字号
```
Hero 主标题: text-3xl md:text-5xl lg:text-6xl
区块标题 H2: text-2xl md:text-4xl
卡片标题 H3: text-lg md:text-xl
正文: text-xs md:text-sm
```

### 间距
```
Section 纵向: py-16 md:py-24（Hero/In Focus）, py-20 md:py-28（标准区块）
页面横向: px-6 md:px-12
卡片内边距: p-6 md:p-8 或 p-8 md:p-10
网格间距: gap-6 或 gap-8
```

### 颜色角色
```
全局画布底色: bg-[#FAF8F5]
特征色块底色: bg-[#EBE4D8]
切角折面暗色: bg-[#DDD4C5]
次级表面/表单底色: bg-[#F5F2EB]
卡片主体底色: bg-white
正文主标题色: text-[#111111]
正文内容色: text-[#635E57]
辅助中性色: text-[#8C867E]
主要按钮: bg-[#111111] hover:bg-black text-white
次要按钮: bg-[#F5F2EB] hover:bg-[#E2DDD5] text-[#111111]
强调动作/图标: text-[#D83A1E], bg-[#D83A1E]
```

---

## [FORBIDDEN] 绝对禁止

以下 class 在本风格中**绝对禁止使用**，生成时必须检查并避免：

### 禁止的 Class
- `bg-gradient-to-r`
- `bg-gradient-to-br`
- `bg-gradient-to-t`
- `shadow-2xl`
- `shadow-inner`（非特定拟真组件不得滥用）
- `border-4`
- `border-8`

### 禁止的模式
- 匹配 `^bg-gradient`（严禁渐变背景，所有颜色必须为纯色）
- 匹配 `^shadow-(?:2xl|inner)`
- 匹配 `^border-(?:4|8)`

---

## [REQUIRED] 必须包含

### 按钮必须包含
```
rounded-full
font-medium
transition-all
duration-300
active:scale-95
```

### 卡片必须包含
```
bg-white
rounded-2xl
border
border-[#E2DDD5]
```

### 输入框必须包含
```
bg-[#F5F2EB]
rounded-xl
text-[#111111]
border
border-transparent
focus:outline-none
focus:ring-2
focus:ring-[#D83A1E]/30
transition-all
```

---

## [COMPARE] 错误 vs 正确对比

### 1. 按钮

[WRONG] **错误示例**（渐变或重边框的通用按钮）：
```html
<button class="bg-gradient-to-r from-red-500 to-amber-500 text-white rounded-lg px-4 py-2 shadow-lg">
  查看详情
</button>
```

[CORRECT] **正确示例**（使用 FIBA 机构规范的胶囊按钮）：
```html
<button class="rounded-full font-medium transition-all duration-300 active:scale-95 bg-[#111111] hover:bg-black text-white text-xs md:text-sm px-6 py-2.5">
  查看详情
</button>
```

### 2. 卡片与板块

[WRONG] **错误示例**（通用暗色或花哨渐变卡片）：
```html
<div class="bg-gray-900 border-2 border-blue-500 rounded-xl p-6 shadow-2xl">
  <h3 class="text-white text-lg font-bold">{TITLE}</h3>
</div>
```

[CORRECT] **正确示例**（暖沙背景上的白浮雕卡片）：
```html
<div class="bg-white rounded-2xl border border-[#E2DDD5] shadow-[0_4px_16px_rgba(27,22,16,0.04)] hover:shadow-[0_12px_32px_rgba(27,22,16,0.08)] p-6 md:p-8 transition-all duration-300">
  <h3 class="text-lg md:text-xl font-bold tracking-tight text-[#111111]">{TITLE}</h3>
  <p class="text-[#635E57] text-xs md:text-sm mt-2 leading-relaxed">{DESCRIPTION}</p>
</div>
```

### 3. 输入框

[WRONG] **错误示例**（冷白色强边框输入框）：
```html
<input class="bg-white border-2 border-gray-300 rounded px-3 py-2 text-black focus:border-blue-500" />
```

[CORRECT] **正确示例**（浅沙色一体化圆角输入框）：
```html
<input class="bg-[#F5F2EB] rounded-xl text-[#111111] px-4 py-3 placeholder-[#8C867E] border border-transparent focus:outline-none focus:ring-2 focus:ring-[#D83A1E]/30 transition-all text-sm" placeholder="{PLACEHOLDER}" />
```

---

## [TEMPLATES] 页面骨架模板

### In Focus 特征板块骨架（截图标杆样式）
```html
<section class="bg-[#EBE4D8] py-16 md:py-24 px-6 md:px-12 relative overflow-hidden border-b border-[#E2DDD5]">
  <!-- 右侧斜切几何折面 -->
  <div class="absolute top-0 right-0 bottom-0 w-[48%] bg-[#DDD4C5] opacity-85 pointer-events-none" style="clip-path: polygon(32% 0, 100% 0, 100% 100%, 0% 100%);"></div>

  <div class="max-w-7xl mx-auto relative z-10">
    <div class="mb-10">
      <h2 class="text-3xl md:text-5xl font-bold tracking-tight text-[#111111]">In Focus</h2>
      <p class="text-[#635E57] text-sm md:text-base mt-2 max-w-xl">{SECTION_SUBTITLE}</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <!-- 左侧大卡片 (7列) -->
      <div class="lg:col-span-7 bg-white rounded-2xl border border-[#E2DDD5] shadow-[0_4px_16px_rgba(27,22,16,0.04)] overflow-hidden flex flex-col justify-between group">
        <div class="aspect-[16/10] bg-[#111111] overflow-hidden">
          <img src="{IMAGE_URL}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="{TITLE}" />
        </div>
        <div class="p-8 md:p-10 flex flex-col justify-between flex-grow">
          <div>
            <h3 class="text-2xl font-bold text-[#111111] group-hover:text-[#D83A1E] transition-colors">{BIG_TITLE}</h3>
            <p class="text-[#635E57] text-sm md:text-base mt-3 leading-relaxed">{BIG_DESC}</p>
          </div>
          <div class="pt-6 mt-6 border-t border-[#E2DDD5] flex items-center justify-between">
            <span class="text-xs font-semibold text-[#111111]">{CTA_TEXT}</span>
            <div class="w-8 h-8 rounded-full bg-[#F5F2EB] flex items-center justify-center text-[#111111] group-hover:bg-[#D83A1E] group-hover:text-white transition-all">
              →
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧垂直堆叠卡片 (5列) -->
      <div class="lg:col-span-5 flex flex-col gap-8 justify-between">
        <!-- 单个小卡片 -->
        <div class="bg-white rounded-2xl border border-[#E2DDD5] shadow-[0_4px_16px_rgba(27,22,16,0.04)] overflow-hidden p-6 md:p-8 group cursor-pointer">
          <h4 class="text-xl font-bold text-[#111111] group-hover:text-[#D83A1E] transition-colors">{SUB_TITLE}</h4>
          <p class="text-[#635E57] text-xs md:text-sm mt-2">{SUB_DESC}</p>
          <div class="pt-4 mt-4 border-t border-[#E2DDD5] flex items-center justify-between text-xs font-semibold text-[#111111]">
            <span>{SUB_CTA}</span>
            <span class="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
```

### 资料卡片网格骨架（暖白画布上的卡片）
```html
<section class="bg-[#FAF8F5] py-20 md:py-28 px-6 md:px-12 border-b border-[#E2DDD5]">
  <div class="max-w-7xl mx-auto">
    <div class="mb-12">
      <span class="text-xs font-bold uppercase tracking-wider text-[#D83A1E]">{CATEGORY_LABEL}</span>
      <h2 class="text-3xl md:text-4xl font-bold tracking-tight text-[#111111] mt-1">{TITLE}</h2>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="bg-white rounded-2xl p-6 md:p-8 border border-[#E2DDD5] shadow-[0_4px_16px_rgba(27,22,16,0.04)] hover:shadow-[0_12px_32px_rgba(27,22,16,0.08)] transition-all duration-300 flex flex-col justify-between">
        <div>
          <span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#F5F2EB] text-[#D83A1E]">{TAG}</span>
          <h3 class="text-lg font-bold text-[#111111] mt-4">{CARD_TITLE}</h3>
          <p class="text-xs text-[#635E57] mt-2 leading-relaxed">{CARD_DESC}</p>
        </div>
        <div class="pt-6 mt-6 border-t border-[#E2DDD5] flex gap-2">
          <button class="w-full rounded-full bg-[#111111] text-white text-xs py-2.5 font-medium hover:bg-black active:scale-95 transition-all">
            {ACTION_TEXT}
          </button>
        </div>
      </div>
    </div>
  </div>
</section>
```

---

## [CHECKLIST] 生成后自检清单

### 色彩规范检查
- [ ] 核心特色背景是否使用了正确的暖沙金色 `#EBE4D8` 与 `#DDD4C5`
- [ ] 页面基础底色是否使用了温暖通透的 `#FAF8F5`
- [ ] 卡片底色是否为纯白 `bg-white`
- [ ] 主标题与按钮是否使用纯正炭黑 `#111111`
- [ ] 强调指示与活动态是否使用篮球场红 `#D83A1E`
- [ ] 正文描述是否使用暖石灰 `#635E57`
- [ ] 是否彻底杜绝了任何形式的渐变背景（`bg-gradient-*`）

### 组件及交互检查
- [ ] 所有操作按钮均为胶囊圆角 `rounded-full`
- [ ] 可交互卡片及按钮包含触感回弹：`active:scale-95`
- [ ] 阴影全部为暖调微阴影，未出现 `shadow-2xl`
- [ ] 输入框底色为浅沙灰 `#F5F2EB`，聚焦光晕为红光透射 `focus:ring-[#D83A1E]/30`