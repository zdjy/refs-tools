# Issue tracker：本地 Markdown

本项目的需求规格和实现 tickets 以 Markdown 文件保存在仓库 `.scratch/` 目录中。

## 约定

- 每个功能或工作主题使用独立目录：`.scratch/<feature-slug>/`。
- 该主题的规格文件为 `.scratch/<feature-slug>/spec.md`。
- 每张实现 ticket 使用单独文件，放在 `.scratch/<feature-slug>/issues/<NN>-<slug>.md`，从 `01` 开始按依赖顺序编号；禁止把多张 ticket 合并到一个文件。
- ticket 在顶部附近记录 `Status:`；准备就绪的 ticket 使用 `ready-for-agent`。
- 依赖记录在 `Blocked by:`，填写所依赖 ticket 的编号和标题；无依赖时写明可立即开始。
- 讨论历史追加在文件底部的 `## Comments` 标题下。

## 技能操作

- 发布 tickets 时，在对应功能目录下创建逐项 ticket 文件。
- 获取 ticket 时，根据用户提供的路径或编号读取对应文件。
