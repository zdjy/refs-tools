# 管理端文件管理首期

Status: implemented-with-acceptance-gaps
Blocked by: 无，可立即开始；复用已实现的媒体控制面。

## 范围

按 [FS-0017](../../../docs/specs/0017-admin-file-management.md) 实现管理页面、元数据 API、实时平台媒体权限、下载理由、删除确认和留存限制。架构取舍见 [ADR 0027](../../../docs/decisions/0027-admin-media-governance.md)。

## Comments

- 已交付 `/admin/system/file` 和 `/api/v1/admin/media`；17 项新增快测、2 项新增 PostgreSQL 集成通过。现有媒体回归、全库快测、类型与生产构建通过，具体数据见规格。
- 本地 MinIO 的合成文件 PUT/complete/下载字节比对/删除通过；浏览器页面、主题、窄屏、下载授权及删除确认通过。
- 保留验收缺口：本地证书阻挡完整浏览器下载落盘；harness 原生键盘激活与 reduced-motion 模拟未完整通过；真实云存储及内容安全待独立验收。
