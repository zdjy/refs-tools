# Feature Spec：篮球裁判综合工具平台第一期 MVP

- 编号：FS-0002
- 状态：需求已确认，待技术栈与 API 实现 ADR 落定后开发
- 日期：2026-11-01
- 基础范围：[MVP-001 第一阶段范围与业务规则](./0001-mvp-scope-and-business-rules.md)
- 架构决策：[ADR 0001](../decisions/0001-monorepo-static-apps-and-api.md)、[ADR 0002](../decisions/0002-direct-to-object-storage-media-flow.md)、[ADR 0003](../decisions/0003-scoped-rbac-and-assignment-workflow.md)

## 1. Goals & Non-Goals

### Goals

1. 交付正式的学习与考试闭环：登录后浏览资料、收藏/最近访问、练习与错题复习、参加正式考试、主观题阅卷、查看考试成绩。
2. 交付正式的裁判资质闭环：创建并审核组织、组织内认证、满足前置条件后申请平台认证、审核/撤销/申诉、展示受限认证档案。
3. 提供可用 Beta：组织赛事选派与赛后记录、离线比赛工作台和 GB 2312 区位码工具、裁判论坛。
4. 采用 Monorepo 中的裁判客户端 SPA 和轻量 API；前端生产产物由 Nginx/CDN 静态托管，不在 2C2G 主机运行前端 Node 服务。
5. 所有媒体采用浏览器直传对象存储。API 只处理授权、上传意图、对象核验、元数据和状态；不代理媒体字节、不缓冲大文件、不转码视频。
6. 所有受保护资源采用服务端 RBAC 与对象级授权；授权按角色、资源、作用域和当前状态判断，默认拒绝。
7. 提供可测试的边界：考试断线恢复、重复请求幂等、上传对象核验、认证/选派状态转换、审计和组织隔离。

### Non-Goals

- 不做私信、实时聊天、赛事群聊或用户关注关系。
- 不做支付、订阅、订单、优惠和收费内容闭环。
- 不做 AI 推荐、AI 自动阅卷或自动替代裁判作最终规则裁决。
- 不做第三方赛事、计分牌、场馆设备或硬件 API 集成。
- 不在应用服务器进行视频转码，也不让 API 接收或缓存媒体文件字节。
- 不做完整的学习完成度/LMS 课程进度系统；首期只保存收藏、最近访问、练习/错题及正式考试记录。
- 不对国家级、一级、二级、三级自动排序或推断资格高低；级别仅用于展示、筛选和审核记录。
- 不允许组织自定义任意权限；不允许发布后直接改写已锁定的岗位名单。
- 不承诺 Beta 模块与正式模块相同的稳定性，但 Beta 同样必须满足授权、审计、隐私和对象存储安全要求。

## 2. Data Model

### 2.1 TypeScript domain types

以下类型定义描述 API/domain 边界，不要求所有枚举直接复用数据库 enum。时间均使用 UTC ISO-8601；金额/任意精度数值不适用。ID 使用不透明 UUID。所有客户端输入必须经过运行时 schema 校验。

```ts
export type UUID = string;
export type ISODateTime = string;
export type EmailAddress = string;
export type Locale = string;

export type PlatformRole =
  | "platform_admin"
  | "content_editor"
  | "grader"
  | "moderator";

export type OrganizationRole =
  | "owner"
  | "organizer"
  | "certifier";

export type ScopedRoleBinding = {
  id: UUID;
  subjectUserId: UUID;
  role: PlatformRole | OrganizationRole | "head_referee";
  scopeType: "platform" | "self" | "organization" | "event" | "match";
  scopeId: UUID | null;
  grantedBy: UUID;
  startsAt: ISODateTime;
  expiresAt: ISODateTime | null;
  revokedAt: ISODateTime | null;
};

export type QualificationLevel = "national" | "level_1" | "level_2" | "level_3";
export type CertificationScope =
  | { type: "platform"; organizationId: null }
  | { type: "organization"; organizationId: UUID };
export type CertificationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "suspended"
  | "revoked"
  | "appeal_pending"
  | "needs_more_information";

export type CertificationRecord = {
  id: UUID;
  subjectUserId: UUID;
  scope: CertificationScope;
  level: QualificationLevel;
  certificateNumber: string;
  issuer: string;
  obtainedAt: string | null;
  evidenceMediaIds: UUID[];
  officiatingHistoryMediaIds: UUID[];
  status: CertificationStatus;
  submittedAt: ISODateTime | null;
  reviewedBy: UUID | null;
  reviewedAt: ISODateTime | null;
  reviewNote: string | null;
  version: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type OrganizationStatus = "pending_review" | "active" | "frozen" | "rejected" | "dissolved";
export type MembershipStatus = "pending" | "active" | "rejected" | "left" | "removed";

export type Organization = {
  id: UUID;
  name: string;
  region: string;
  purpose: string;
  ownerUserId: UUID;
  status: OrganizationStatus;
  reviewedBy: UUID | null;
  reviewedAt: ISODateTime | null;
  createdAt: ISODateTime;
};

export type OrganizationMembership = {
  id: UUID;
  organizationId: UUID;
  userId: UUID;
  status: MembershipStatus;
  joinedAt: ISODateTime | null;
  endedAt: ISODateTime | null;
  invitedBy: UUID | null;
};

export type MediaPurpose =
  | "learning"
  | "certification_evidence"
  | "exam_answer"
  | "forum_attachment"
  | "post_game_record";
export type MediaStatus = "pending_upload" | "available" | "rejected" | "expired" | "deleted";
export type MediaVisibility = "private" | "authenticated";

export type MediaObject = {
  id: UUID;
  ownerUserId: UUID;
  purpose: MediaPurpose;
  objectKey: string;
  originalFileName: string | null;
  declaredContentType: string;
  verifiedContentType: string | null;
  expectedSizeBytes: number;
  verifiedSizeBytes: number | null;
  checksum: string | null;
  status: MediaStatus;
  visibility: MediaVisibility;
  createdAt: ISODateTime;
  verifiedAt: ISODateTime | null;
  deletedAt: ISODateTime | null;
};

export type LearningAssetStatus = "draft" | "published" | "unpublished";
export type LearningAsset = {
  id: UUID;
  version: number;
  title: string;
  summary: string;
  body: unknown; // 白名单结构化富文本，不接受任意 HTML。
  categoryIds: UUID[];
  tagIds: UUID[];
  mediaIds: UUID[];
  allowDownload: boolean;
  status: LearningAssetStatus;
  publishedAt: ISODateTime | null;
  createdBy: UUID;
  createdAt: ISODateTime;
};

export type QuestionKind = "single_choice" | "true_false" | "multiple_choice" | "subjective";
export type Question = {
  id: UUID;
  version: number;
  kind: QuestionKind;
  prompt: unknown; // 允许安全富文本及已核验媒体引用。
  options: Array<{ id: string; body: unknown }> | null;
  answerKey: unknown | null; // 服务端私有字段，不得出现在作答响应中。
  explanation: unknown;
  basePoints: number;
  rubric: unknown | null; // 主观题满分说明/评分标准。
  mediaIds: UUID[];
  status: "draft" | "published" | "unpublished";
  createdBy: UUID;
  createdAt: ISODateTime;
};

export type ExamStatus = "draft" | "published" | "closed" | "unpublished";
export type AttemptStatus = "in_progress" | "pending_review" | "passed" | "failed";
export type ExamAggregation = "highest_score" | "last_attempt" | "first_pass";

export type ExamPolicy = {
  opensAt: ISODateTime;
  closesAt: ISODateTime;
  durationSeconds: number;
  syncGraceSeconds: number;
  maxAttempts: number;
  cooldownSeconds: number;
  passScore: number;
  typeWeights: Partial<Record<QuestionKind, number>>;
  subjectiveCountsTowardScore: boolean;
  aggregation: ExamAggregation;
  eligibility: {
    organizationIds: UUID[];
    requiredMembership: boolean;
    inviteOnly: boolean;
    requiredCertificationScopes: Array<"platform" | "organization">;
  };
  resultDisclosure: "full" | "summary" | "score_only" | "delayed";
};

export type Exam = {
  id: UUID;
  version: number;
  title: string;
  status: ExamStatus;
  questionSnapshot: Array<{ questionId: UUID; questionVersion: number; order: number; points: number }>;
  policy: ExamPolicy;
  createdBy: UUID;
  publishedAt: ISODateTime | null;
};

export type ExamAttempt = {
  id: UUID;
  examId: UUID;
  examVersion: number;
  userId: UUID;
  attemptNumber: number;
  status: AttemptStatus;
  startedAt: ISODateTime;
  deadlineAt: ISODateTime;
  submittedAt: ISODateTime | null;
  syncGraceEndsAt: ISODateTime | null;
  serverRevision: number;
  objectiveScore: number | null;
  subjectiveScore: number | null;
  finalScore: number | null;
  passed: boolean | null;
  createdAt: ISODateTime;
};

export type AttemptAnswer = {
  id: UUID;
  attemptId: UUID;
  questionId: UUID;
  questionVersion: number;
  answer: unknown; // 选项 ID、文本或通过媒体引用关联的图片。
  serverRevision: number;
  savedAt: ISODateTime;
  submittedSnapshot: boolean;
};

export type ReviewStatus = "pending" | "submitted" | "overridden";
export type SubjectiveReview = {
  id: UUID;
  attemptId: UUID;
  questionId: UUID;
  graderUserId: UUID;
  score: number;
  feedback: string;
  status: ReviewStatus;
  submittedAt: ISODateTime | null;
  overriddenBy: UUID | null;
  overrideReason: string | null;
};

export type AssignmentStatus =
  | "pending_acceptance"
  | "accepted"
  | "declined"
  | "expired"
  | "replacing"
  | "replaced"
  | "completed"
  | "cancelled";
export type MatchStatus =
  | "draft"
  | "published"
  | "partially_confirmed"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "exception";

export type Assignment = {
  id: UUID;
  matchId: UUID;
  positionKey: string;
  refereeUserId: UUID;
  requiredCertificationScope: "platform" | "organization" | null;
  status: AssignmentStatus;
  responseDeadlineAt: ISODateTime;
  acceptedAt: ISODateTime | null;
  replacedByAssignmentId: UUID | null;
  qualificationSnapshot: unknown;
  overrideReason: string | null;
  version: number;
};

export type AttendanceStatus = "not_checked_in" | "checked_in" | "corrected" | "excused";
export type Attendance = {
  id: UUID;
  assignmentId: UUID;
  matchId: UUID;
  status: AttendanceStatus;
  checkedInAt: ISODateTime | null;
  codeId: UUID | null;
  correctionReason: string | null;
  correctedBy: UUID | null;
};

export type PostGameRecordStatus = "draft" | "submitted" | "returned" | "approved" | "missing";
export type PostGameRecord = {
  id: UUID;
  matchId: UUID;
  submittedBy: UUID;
  status: PostGameRecordStatus;
  mediaIds: UUID[]; // 至少一张预览图；原图可选。
  submittedAt: ISODateTime | null;
  dueAt: ISODateTime;
  reviewedBy: UUID | null;
  reviewReason: string | null;
  approvedAt: ISODateTime | null;
  version: number;
};

export type AuditEvent = {
  id: UUID;
  actorUserId: UUID;
  action: string;
  resourceType: string;
  resourceId: UUID;
  scopeType: string;
  scopeId: UUID | null;
  reason: string | null;
  before: unknown | null;
  after: unknown | null;
  createdAt: ISODateTime;
};
```

### 2.2 关系数据库字段与约束

下表是逻辑 PostgreSQL 模型。所有表均应有主键、创建/更新时间字段；大对象只存对象 key/元数据，不存媒体字节。具体 SQL 类型、迁移工具和连接池须在技术栈 ADR 中决定。

| 表 | 关键字段（类型） | 数据库注释/约束 |
| --- | --- | --- |
| `users` | `id uuid PK`, `email citext UNIQUE NULL`, `email_verified_at timestamptz NULL`, `password_hash text NULL`, `phone_e164 text UNIQUE NULL`, `status text`, `created_at`, `deleted_at` | 至少有一个可登录凭据；密码只存强哈希；验证码不得存明文。邮箱/手机号唯一，禁止跨用户重复绑定。 |
| `referee_profiles` | `user_id uuid PK/FK`, `legal_name text NULL`, `phone_e164 text NULL`, `region_code text NULL`, `region_label text NULL`, `address_detail text NULL`, `birth_date date NULL`, `avatar_media_id uuid NULL`, `created_at`, `updated_at` | 实名字段受限访问；列表使用目的限定投影，不返回整行。昵称唯一来源为 `users.display_name`，不在本表重复；未验证手机号暂不加唯一约束，见 FS-0023 §3.1。 |
| `organizations` | `id uuid PK`, `name text`, `region text`, `purpose text`, `owner_user_id uuid FK`, `status text`, `reviewed_by uuid NULL`, `reviewed_at timestamptz NULL` | `status=active` 才允许业务操作；冻结/驳回保留历史。 |
| `organization_memberships` | `id uuid PK`, `organization_id uuid FK`, `user_id uuid FK`, `status text`, `invited_by uuid NULL`, `joined_at NULL`, `ended_at NULL` | `(organization_id,user_id)` 对当前 active/pending 关系唯一；所有者不得被删除到组织无所有者。 |
| `role_bindings` | `id uuid PK`, `subject_user_id uuid FK`, `role text`, `scope_type text`, `scope_id uuid NULL`, `granted_by uuid FK`, `starts_at`, `expires_at NULL`, `revoked_at NULL` | 平台与业务角色统一存储，平台绑定 scope ID 为 NULL；角色/范围组合受 CHECK 约束。作用域由服务端解析，授予者必须有覆盖该 scope 的授权，见 ADR 0014。 |
| `organization_invites` | `id uuid PK`, `organization_id uuid FK`, `token_hash text UNIQUE`, `max_uses int`, `uses int`, `expires_at`, `revoked_at NULL`, `created_by uuid FK` | 只存 token 哈希；事务内原子扣减使用次数；永不用于授予角色。 |
| `organization_applications` | `id uuid PK`, `applicant_id uuid FK`, `organization_id uuid FK NULL`, `organization_payload jsonb`, `status text`, `reviewed_by uuid NULL`, `review_reason text NULL` | 自助创建先 `pending_review`；未 active 不允许业务授权。平台创建邀请码为独立凭证表/用途。 |
| `certifications` | `id uuid PK`, `user_id uuid FK`, `scope_type text`, `organization_id uuid NULL`, `level text`, `status text`, `certificate_number text`, `issuer text`, `obtained_at date NULL`, `version int`, `reviewed_by uuid NULL`, `reviewed_at NULL`, `review_note text NULL` | `scope_type=platform` 时组织 ID 必须 NULL；organization 时必须非 NULL。每组织/用户最多一条当前有效记录；保留版本/状态历史。级别不排序。 |
| `certification_media` | `certification_id uuid FK`, `media_id uuid FK`, `kind text` | 关联证书原件、执裁履历、补充材料；访问按认证 scope 校验并审计。 |
| `certification_appeals` | `id uuid PK`, `certification_id uuid FK`, `appellant_id uuid FK`, `reason text`, `status text`, `reviewer_id uuid NULL`, `decision text NULL`, `decided_at NULL` | 原审核者不得处理对应申诉；申诉不自动改变原认证状态。 |
| `media_objects` | `id uuid PK`, `owner_user_id uuid FK`, `purpose text`, `object_key text UNIQUE`, `declared_content_type text`, `verified_content_type text NULL`, `expected_size_bytes bigint`, `verified_size_bytes bigint NULL`, `checksum text NULL`, `status text`, `expires_at`, `verified_at NULL`, `deleted_at NULL` | 状态机至少 pending/available/rejected/expired/deleted；对象 key 服务端生成；不保存签名 URL。 |
| `media_upload_events` | `id uuid PK`, `media_id uuid FK`, `provider_event_id text UNIQUE NULL`, `event_type text`, `received_at`, `verified_at NULL` | 幂等去重、拒绝伪造/过期事件；事件 payload 不存凭证或签名 URL。 |
| `learning_categories` | `id uuid PK`, `parent_id uuid NULL FK`, `name text`, `slug text`, `depth smallint`, `status text`, `created_by uuid FK` | 最大深度 3；层级变更必须校验；停用保留历史引用。 |
| `learning_assets` | `id uuid PK`, `status text`, `current_version int`, `allow_download bool`, `created_by uuid FK`, `published_at NULL` | 逻辑内容实体；版本内容独立存储。 |
| `learning_asset_versions` | `asset_id uuid FK`, `version int`, `title text`, `summary text`, `body jsonb`, `created_by uuid FK`, `created_at`, `published_at NULL` | `(asset_id,version)` PK；发布版本不可变。 |
| `learning_asset_categories` | `asset_id uuid FK`, `category_id uuid FK`, `asset_version int` | 多对多分类关联；历史版本引用保留。 |
| `learning_asset_media` | `asset_id uuid FK`, `asset_version int`, `media_id uuid FK`, `purpose text` | 媒体必须已核验；版本化关联。 |
| `questions` | `id uuid PK`, `kind text`, `status text`, `current_version int`, `created_by uuid FK` | 题型单一；发布状态由版本控制。 |
| `question_versions` | `question_id uuid FK`, `version int`, `prompt jsonb`, `options jsonb NULL`, `answer_key jsonb NULL`, `explanation jsonb`, `base_points numeric`, `rubric jsonb NULL` | `(question_id,version)` PK；答案 key 永不出现在普通题目读取 API。 |
| `exams` | `id uuid PK`, `status text`, `current_version int`, `created_by uuid FK`, `published_at NULL` | 草稿可编辑；发布版本不可变。 |
| `exam_versions` | `exam_id uuid FK`, `version int`, `title text`, `policy jsonb`, `question_snapshot jsonb`, `published_at`, `created_by uuid FK` | 固定题目、版本、顺序、答案版本引用、分值和考试策略快照；不得被后续题目修改影响。 |
| `exam_attempts` | `id uuid PK`, `exam_id uuid FK`, `exam_version int`, `user_id uuid FK`, `attempt_number int`, `status text`, `started_at`, `deadline_at`, `submitted_at NULL`, `grace_ends_at NULL`, `server_revision int`, `objective_score numeric NULL`, `subjective_score numeric NULL`, `final_score numeric NULL`, `passed bool NULL` | `(exam_id,user_id,attempt_number)` UNIQUE；同一用户同一考试最多一个 in-progress；提交事务锁定次数并原子冻结。 |
| `attempt_answers` | `id uuid PK`, `attempt_id uuid FK`, `question_id uuid FK`, `question_version int`, `answer jsonb`, `server_revision int`, `saved_at`, `submitted_snapshot bool` | `(attempt_id,question_id)` UNIQUE；revision 单调递增；服务端时间决定截止有效性。 |
| `subjective_reviews` | `id uuid PK`, `attempt_id uuid FK`, `question_id uuid FK`, `grader_id uuid FK`, `score numeric`, `feedback text`, `status text`, `submitted_at NULL` | 分数在 0..题目满分内；改判另写审计，不覆盖原阅卷记录。 |
| `study_user_state` | `user_id uuid FK`, `asset_id uuid FK`, `is_favorite bool`, `last_visited_at NULL` | `(user_id,asset_id)` PK；服务端为准。 |
| `practice_answers` | `id uuid PK`, `user_id uuid FK`, `question_id uuid FK`, `question_version int`, `is_correct bool`, `answered_at` | 历史作答不可变；错题掌握连续正确数可派生或维护并事务更新。 |
| `wrong_question_state` | `user_id uuid FK`, `question_id uuid FK`, `consecutive_correct smallint`, `status text`, `updated_at` | `(user_id,question_id)` PK；达到连续 2 次正确后归档，不删除作答历史。 |
| `events` | `id uuid PK`, `organization_id uuid FK`, `name text`, `status text`, `created_by uuid FK` | 组织 active 才可创建/发布；事件级角色通过 scoped binding 授权。 |
| `matches` | `id uuid PK`, `event_id uuid FK`, `status text`, `starts_at timestamptz`, `venue text`, `response_deadline_at`, `post_game_due_at`, `version int` | 发布后岗位结构锁定；时间地点变更增加版本并触发接受状态重置。 |
| `match_positions` | `id uuid PK`, `match_id uuid FK`, `position_key text`, `required_count int`, `certification_scope text NULL`, `required bool` | 预置岗位模板实例；发布后不可普通增删改。 |
| `assignments` | `id uuid PK`, `position_id uuid FK`, `referee_user_id uuid FK`, `status text`, `response_deadline_at`, `accepted_at NULL`, `replaced_by_id uuid NULL`, `qualification_snapshot jsonb`, `override_reason text NULL`, `version int` | 并发状态转换使用版本号/条件更新；资格越过理由必填。 |
| `attendance_codes` | `id uuid PK`, `match_id uuid FK`, `code_hash text`, `valid_from`, `valid_until`, `revoked_at NULL`, `created_by uuid FK` | 只存哈希；时间窗内有效；不能由客户端自选比赛/岗位 ID 绕过校验。 |
| `attendance_records` | `id uuid PK`, `assignment_id uuid FK`, `status text`, `checked_in_at NULL`, `corrected_by uuid NULL`, `correction_reason text NULL` | 每岗位签到唯一或有审计版本；人工纠正必须有原因。 |
| `post_game_records` | `id uuid PK`, `match_id uuid FK`, `submitted_by uuid FK`, `status text`, `due_at`, `submitted_at NULL`, `reviewed_by uuid NULL`, `review_reason text NULL`, `version int` | 每场一份主记录；主裁默认提交；退回原因必填；approved 版本只读。 |
| `post_game_media` | `record_id uuid FK`, `media_id uuid FK`, `kind text`, `sort_order int` | 至少一张预览图；原图可选；对象私有、长期保留、访问/删除审计。 |
| `forum_posts` | `id uuid PK`, `author_id uuid FK`, `board_id uuid FK`, `body jsonb`, `status text`, `edited_until timestamptz`, `deleted_at NULL` | 富文本服务端清洗；删除为软删除；附件发布前完成基础校验。 |
| `forum_reports` | `id uuid PK`, `post_id uuid FK NULL`, `reply_id uuid FK NULL`, `reporter_id uuid FK`, `reason text`, `status text`, `handled_by uuid NULL` | 幂等/防刷；审核操作写入审计。 |
| `audit_events` | `id uuid PK`, `actor_user_id uuid`, `action text`, `resource_type text`, `resource_id uuid`, `scope_type text`, `scope_id uuid NULL`, `organization_id uuid NULL`, `reason text NULL`, `before jsonb NULL`, `after jsonb NULL`, `created_at timestamptz` | append-only；不允许业务角色更新/删除/清空；organization ID 保存服务端解析归属，支持组织及下属资源查询。before/after 仅白名单状态/版本/角色/UUID 投影，不得记录验证码、密码、签名 URL、原件内容。 |

### 2.3 核心唯一性和状态约束

- 用户邮箱、手机号唯一且仅属于一个用户；账号合并必须是显式、审计的后台流程。
- 同一组织/用户最多一条当前有效组织认证；平台认证单独唯一约束。
- 一个考试版本发布后不可更新；修改考试必须生成新版本。
- 同一用户/考试活动尝试唯一；提交、次数扣减、答案冻结和状态转换必须原子提交。
- 媒体业务状态只允许从 pending 到 available/rejected/expired，再按授权删除；重复对象通知不产生重复副作用。
- 已发布比赛岗位不能普通编辑；岗位替换是新旧 assignment 的有审计关联，不覆盖历史裁判。
- 组织成员删除为状态变更，不物理删除历史业务关联。

## 3. API Contracts

### 3.1 通用约定

- API 路径前缀：`/api/v1`。所有接口使用 HTTPS 和 JSON，媒体上传除外。
- 认证使用服务端可撤销会话 Cookie：浏览器仅发送 `__Host-refs_session` 的 `HttpOnly; Secure; SameSite=Lax; Path=/` Cookie；服务端每次保护请求重新读取有效用户、角色绑定和资源作用域，不使用 Bearer/accessToken。
- 资源 ID 使用 UUID；响应中的日期为 UTC ISO-8601。
- 所有非幂等创建接口支持 `Idempotency-Key`；状态转换支持 `If-Match` 或 `expectedVersion`，避免重放和并发覆盖。
- 成功响应统一形状：`{ "data": ..., "meta"?: ... }`。列表支持 `cursor`、`limit`。
- 错误统一形状：`{ "error": { "code": string, "message": string, "requestId": string, "details"?: unknown } }`。
- 常见状态码：`400` 输入错误、`401` 未登录、`403` 无权限/邮箱未验证、`404` 不存在或不可见、`409` 状态/版本冲突、`413` 超过大小限制、`422` 业务校验失败、`429` 频控。
- 不返回对象存储密钥、签名 URL 到日志/审计字段；签名 URL 只在上传/下载响应短暂返回。

### 3.2 身份与账号

| Method / Endpoint | 请求与响应 | 鉴权要求 |
| --- | --- | --- |
| `POST /auth/email-challenges` | 入参 `{email, purpose}`；回 `{challengeId, expiresAt}`。不得暴露邮箱是否已注册。 | 匿名；IP/邮箱频控 |
| `POST /auth/register` | `{challengeId, code, displayName, password?}`；回 `{user, expiresAt}` 并通过安全会话 Cookie 建立会话。 | 匿名；验证码有效且未使用 |
| `POST /auth/login/email-code` | `{email, challengeId, code}`；回 `{user, expiresAt}` 并通过安全会话 Cookie 建立会话。 | 匿名；验证码一次性 |
| `POST /auth/login/password` | `{email, password}`；回 `{user, expiresAt}` 并通过安全会话 Cookie 建立会话。 | 匿名；已设置密码 |
| `POST /auth/password` | 首次设置 `{newPassword}`；更换已有密码 `{newPassword, challengeId, code}`；回 `{user, expiresAt}` 并轮换安全会话 Cookie、撤销所有旧会话。 | 已登录；无 proof 仅允许邮箱已验证且尚无密码；已有密码必须完成本人邮箱重新验证 |
| `POST /auth/credential-merge-requests` | `{sourceAccountId, targetCredential}`；回 `{requestId,status}`。 | 已验证两个凭据；人工审核；不自动合并 |

认证会话响应的 `user.hasPassword` 表示是否已设置密码，不包含密码或哈希。账号页据此区分首次设置与修改；服务端在同一事务的账号锁内重新核验会话、邮箱验证与密码状态，不信任前端投影。proof 必须完全省略或同时提供 `challengeId`、`code`，不接受残缺 proof。

登录与注册表单错误反馈的验收：

- 邮箱、显示名称、验证码及密码的字段校验错误仅在对应输入框下方展示，不在表单顶部重复展示字段错误摘要或类型列表。
- 提交校验失败后聚焦首个无效输入框，并通过 `aria-invalid`、`aria-describedby` 关联字段错误；保留用户已输入的可恢复内容。
- 网络异常、登录失败等非字段错误仍提供可见提示；提交失败且无无效字段时聚焦该提示。

账号注册后首次设置密码的验收：

- 邮箱验证码注册成功进入 `/account`，显示“设置登录密码”，不显示验证码输入及发送按钮；输入一致且符合策略的密码后显示注册完成。
- 刷新账号页仍可继续首次设置；设置成功后会话投影的 `hasPassword` 为 `true`，旧会话失效，新密码可登录。
- 已有密码时仍显示邮箱验证码；省略验证码的请求返回 `403 PASSWORD_VERIFICATION_REQUIRED`，未验证邮箱返回 `403 EMAIL_NOT_VERIFIED`，失效会话返回 `401 UNAUTHENTICATED`。
- 弱密码、确认不一致或网络错误不显示成功，保留可恢复输入；并发首次设置最多一个成功，不得覆盖已设置的密码。
- UI 延续[共享 UI 规范](../ui/macos_fiba.md)，保留字段标签与移动端触控目标，不新增视觉例外；首次设置及更换登录密码均仅在对应输入框下方展示字段错误，不重复展示顶部字段错误列表。提交校验失败聚焦首个无效输入框，非字段错误仍保留可见提示并在无无效字段时聚焦该提示。

### 3.3 组织和成员

| Method / Endpoint | 请求与响应 | 鉴权要求 |
| --- | --- | --- |
| `POST /organizations` | `{name,region,purpose,ownerLegalName,contact,platformInviteToken?}`；回 `{organization,status:"pending_review"|"active"}`。 | 已验证普通用户；有效一次性平台邀请码可直接创建为 active；邀请码用途与成员码隔离 |
| `GET /organizations/{id}` | 回组织公开/成员视图，字段按关系过滤。 | 登录；私有字段需组织成员或平台权限 |
| `POST /organizations/{id}/membership-requests` | `{message?}`；回 `{membershipId,status:"pending"}`。 | 已验证用户；目标组织 active |
| `POST /organizations/{id}/invitations` | `{userId,expiresAt?}`；回 `{invitationId}`。 | 组织 owner/organizer |
| `POST /organizations/{id}/invitations/{invitationId}/accept` | 回 active membership。 | 被邀请用户本人；邮箱已验证；幂等 |
| `POST /organizations/{id}/invitations/{invitationId}/decline` | 回 invitation 状态。 | 被邀请用户本人；幂等 |
| `POST /organizations/{id}/join-codes` | `{expiresAt,maxUses}`；回一次性明文 token。 | 组织 owner/organizer；仅加入用途 |
| `POST /organization-join-codes/redeem` | `{token}`；回 membership；只有成员码立即激活。 | 已验证用户 |
| `POST /organizations/{id}/memberships/{membershipId}/decision` | `{decision:"approve"|"reject"}`；回新 membership 状态。 | 组织 owner/organizer |
| `POST /organizations/{id}/role-bindings` | `{userId,role:"organizer"|"certifier"}`；回 binding。 | 组织 owner；certifier 不能授予平台权限 |
| `POST /events/{eventId}/head-referees` | `{userId,matchIds?}`；回 event/match-scoped binding。 | 组织 owner/organizer；目标用户须为本组织成员；不得创建 organization-scoped head referee |
| `DELETE /events/{eventId}/head-referees/{bindingId}` | 回 `{revoked:true}`。 | 组织 owner/organizer；立即撤权并审计 |
| `DELETE /organizations/{id}/role-bindings/{bindingId}` | 回 `{revoked:true}`。 | 组织 owner；即时撤权；审计 |

### 3.4 媒体直传

| Method / Endpoint | 请求与响应 | 鉴权要求 |
| --- | --- | --- |
| `POST /media/upload-intents` | `{purpose,contentType,sizeBytes,fileName?,target:{type,id}?}`；回 `{mediaId,objectKey,upload:{method,url,headers,expiresAt},multipart?}`。 | 登录；邮箱验证/目标资源权限按 purpose 要求；未授权不得签名 |
| `POST /media/{mediaId}/complete` | `{etag?,checksum?}`；API 必须向存储核验 object HEAD/stat 后回 `{status:"available",verifiedSizeBytes}`。 | 上传 owner；幂等 |
| `GET /media/{mediaId}/read-url` | 回 `{url,expiresAt}`；不持久化 URL。 | 当前资源范围授权；敏感访问审计 |
| `POST /media/provider-events/{provider}` | 存储事件；回 `{accepted:true}`。 | Provider 签名/来源校验；事件 ID 幂等；不要求用户 token |
| `DELETE /media/{mediaId}` | 回 `{status:"deleted"}`。 | 资源所有者或资源范围管理者；长期留存资源按审批策略限制；审计 |

直接 PUT/POST 到对象存储的请求由浏览器发送，不经过此 API。完成接口不能信任客户端声明作为对象已上传的证明。

### 3.5 学习资料、练习和错题本

| Method / Endpoint | 请求与响应 | 鉴权要求 |
| --- | --- | --- |
| `GET /learning/categories` | 回 `{items:[{id,parentId,name,depth}]}`。 | 登录；未验证邮箱可读 |
| `GET /learning/assets` | 查询 `q,categoryId,tagId,cursor`；回已发布资料摘要。 | 登录；未验证邮箱可读 |
| `GET /learning/assets/{id}` | 回当前 published version；下载权限按 `allowDownload` 控制。 | 登录；媒体 URL 另行授权 |
| `PUT /me/learning-state/{assetId}` | `{favorite?,visited:true?}`；回服务端状态。 | 已登录；仅本人 |
| `POST /practice/sessions` | `{filters,mode:"ordered"|"random"}`；回不含 answerKey 的题目列表。 | 已验证邮箱 |
| `POST /practice/answers` | `{questionId,questionVersion,answer,idempotencyKey}`；回 `{isCorrect,correctAnswer?,explanation,wrongState}`。 | 已验证邮箱；限本人会话 |
| `GET /me/wrong-questions` | 回错题和连续答对状态；答案/解析依题目发布策略。 | 已登录；仅本人 |

### 3.6 内容编辑与考试

| Method / Endpoint | 请求与响应 | 鉴权要求 |
| --- | --- | --- |
| `GET /exams` | 查询可见考试摘要，不暴露答案。 | 登录；按考试 eligibility 过滤 |
| `POST /exams/{id}/attempts` | `{idempotencyKey}`；回 `{attemptId,deadlineAt,serverRevision,questions}`。 | 邮箱已验证；报名/认证/组织/邀请码条件满足；仅一个活动尝试 |
| `PUT /attempts/{id}/answers/{questionId}` | `{answer,clientRevision,expectedServerRevision}`；回 `{serverRevision,savedAt}`。 | 本人活动 attempt；事务校验截止/宽限和版本 |
| `POST /attempts/{id}/submit` | `{expectedServerRevision,idempotencyKey}`；回 `{status,submittedAt,objectiveScore,reviewPending}`。 | 本人活动 attempt；重复提交返回同一结果 |
| `GET /attempts/{id}` | 回本人答题状态、剩余服务端时间和保存 revision。 | 本人或授权阅卷/管理员 |
| `GET /me/exam-results/{examId}` | 回尝试列表、汇总、待阅卷/通过/失败和展示策略裁剪后的反馈。 | 本人 |
| `GET /grading/queue` | 回待阅主观题摘要。 | `grader` |
| `POST /grading/attempts/{attemptId}/reviews` | `{questionId,score,feedback,expectedVersion}`；回评分与尝试最新状态。 | `grader`；该考试授权范围 |

### 3.7 认证与申诉

| Method / Endpoint | 请求与响应 | 鉴权要求 |
| --- | --- | --- |
| `POST /certifications` | `{scope,level,certificateNumber,issuer,obtainedAt,evidenceMediaIds,historyMediaIds,statement}`；回 draft/submitted。 | 已验证用户；组织 scope 必须是 active member |
| `POST /certifications/{id}/submit` | `{expectedVersion}`；回 `under_review`。 | 申请人本人 |
| `GET /me/certifications` | 回本人认证列表、范围、级别、状态和审核摘要。 | 本人 |
| `GET /organizations/{orgId}/certifications/review-queue` | 回组织申请摘要。 | 该组织 `certifier`；本组织成员范围 |
| `POST /organizations/{orgId}/certifications/{id}/decision` | `{decision:"approve"|"reject"|"needs_more_information",reason}`；回状态。 | 组织 `certifier`；不能自审；本组织有效成员 |
| `POST /organizations/{orgId}/certifications/{id}/revoke` | `{reason}`；回 `{status:"revoked"}`。 | 组织 owner 或授权 certifier；只可撤销本组织认证；审计 |
| `POST /certifications/{id}/appeals` | `{reason,evidenceMediaIds?}`；回 `appeal_pending`。 | 申请人/认证持有人；适用驳回或撤销结果 |
| `GET /organizations/{orgId}/audit-events` | 查询 `{resourceType?,resourceId?,cursor?}`；回本组织业务审计摘要。 | 组织 owner；仅该组织范围 |

### 3.8 赛事、选派、签到和赛后记录 Beta

| Method / Endpoint | 请求与响应 | 鉴权要求 |
| --- | --- | --- |
| `POST /organizations/{orgId}/events` | `{name,...}`；回 draft event。 | active org `organizer`/owner |
| `POST /events/{eventId}/matches` | `{startsAt,venue,positions,responseDeadlineAt,postGameDueAt}`；回 draft match。 | 事件作用域 organizer |
| `POST /matches/{matchId}/publish` | `{assignments:[{positionId,refereeUserId,overrideReason?}],expectedVersion}`；回锁定名单及岗位状态。 | organizer；候选人必须 active member；越过资格提示需理由；审计 |
| `POST /assignments/{id}/respond` | `{decision:"accept"|"decline",expectedVersion}`；回状态。 | 被指派裁判本人；仅 pending 且未过期 |
| `POST /assignments/{id}/replacement` | `{replacementUserId,reason}`；回替换中的新岗位/邀请。 | organizer 或绑定赛事/比赛的 head_referee |
| `POST /matches/{id}/cancel` | `{reason,expectedVersion}`；回 cancelled。 | organizer；通知岗位人员 |
| `POST /matches/{id}/complete` | `{expectedVersion}`；回 completed。 | organizer 或绑定该比赛的 head_referee；状态允许完成且所有岗位有终态 |
| `PATCH /matches/{id}/schedule` | `{startsAt?,venue?,expectedVersion}`；回新比赛版本和重新确认岗位。 | organizer；比赛未开始；审计并通知 |
| `POST /matches/{id}/attendance-codes` | `{validFrom,validUntil}`；回短码/二维码内容（仅创建时明文返回）。 | organizer/head referee；比赛 scope |
| `POST /assignments/{id}/check-in` | `{code}`；回 attendance。 | 该岗位指派裁判本人；时间窗内；幂等 |
| `POST /attendance/{id}/correction` | `{status,reason}`；回修正记录。 | organizer/head_referee；原因必填；审计 |
| `POST /matches/{id}/post-game-record/upload-intents` | `{previewFiles:[{name,type,size}],originalFiles?:[...]}`；回各媒体上传授权。 | 已签到主裁或已接管 head_referee；媒体走 ADR 0002 |
| `POST /matches/{id}/post-game-records` | `{mediaIds,expectedVersion}`；回 submitted record。 | 主裁本人或接管裁判长；提交截止规则适用；幂等 |
| `POST /post-game-records/{id}/review` | `{decision:"approve"|"return",reason?}`；回状态。 | 赛事所属组织 organizer；退回必须有 reason |
| `POST /post-game-records/{id}/takeover` | `{reason}`；回记录责任绑定。 | 绑定的 head_referee；审计 |

### 3.9 论坛 Beta 与离线工具

| Method / Endpoint | 请求与响应 | 鉴权要求 |
| --- | --- | --- |
| `GET /forum/boards` | 回 active boards。 | 登录 |
| `GET /forum/posts` | 查询 `{boardId?,tag?,cursor?}`；回公开帖子摘要。 | 登录；过滤隐藏/软删除内容 |
| `GET /forum/posts/{id}` | 回帖子、回复和可见附件摘要。 | 登录；隐藏内容仅作者/版主可查看 |
| `POST /forum/posts/{id}/replies` | `{body,mediaIds?}`；回 reply。 | 邮箱已验证；频控；服务端清洗富文本 |
| `PUT /forum/posts/{id}/reaction` | `{type:"like"|"favorite",enabled:boolean}`；回当前状态。 | 登录；仅本人关系，幂等 |
| `POST /forum/posts` | `{boardId,title,body,mediaIds,externalLinks}`；回可见帖子。 | 邮箱已验证；附件基础校验完成；频控 |
| `PATCH /forum/posts/{id}` | `{body,expectedVersion}`；回帖子；必须在 `editedUntil` 前。 | 作者本人；或 moderator 隐藏处理 |
| `DELETE /forum/posts/{id}` | 回软删除状态。 | 作者本人或 moderator；审计 |
| `POST /forum/reports` | `{postId?,replyId?,reason}`；回 `{reportId,status}`。 | 登录；防重复/频控 |
| `POST /moderation/resources/{id}/actions` | `{action:"hide"|"restore"|"ban"|"mute",reason,duration?}`；回处理结果。 | `moderator`；审计 |
| `POST /moderation/appeals/{id}/decision` | `{decision,reason}`；回申诉结果。 | `moderator`；不得由原处罚人单独处理（若权限配置允许需强制回避） |
| `GET /tools/rules/current` | 回默认规则集参数及版本。 | 登录；只读。工具会话数据本身只保存在客户端，不提供会话同步 API |

> 离线比赛工作台的计时、犯规、事件日志和导出内容留在浏览器本地；如没有规则分发/版本查询需求，不应新增会话同步 API。GB 2312 转换使用客户端内置数据/算法，不需要业务 API。

### 3.10 API 验收要点

- 所有 ID-based 读取和写入在服务端按资源 scope 授权；跨组织尝试不泄露资源存在性。
- answer key 只向题目编辑授权角色和判分服务可见，绝不返回到练习/考试客户端。
- 所有 create/submit/review/decision/publish/check-in 接口具备幂等键或状态版本约束。
- 数据库变更、审计事件和状态转换在同一事务内提交，或通过可靠 outbox 保证一致性。
- 媒体端点 JSON 体积有严格上限；媒体字节只在浏览器与对象存储之间传输。

## 4. Edge Case Handling

### 4.1 断网、弱网和会话恢复

- **学习目录断网**：展示已缓存目录/封面和 stale/offline 状态；正文/媒体不可用时给出重试入口，不伪装成完整离线内容。
- **服务端学习状态同步失败**：收藏/最近访问可在当前页面短暂排队重试；只有服务端确认后才显示为已同步。设备端不持久化错题、答卷或私密媒体。
- **练习断网**：未能从服务端取题或判分时显示待同步/不可判分；不得在客户端泄露 answer key 来实现离线判分。
- **正式考试断网**：服务端计时继续；恢复后读取服务端 `deadlineAt` 和 `serverRevision`，只恢复该 revision 之前成功保存的答案。客户端时间不能延长考试。
- **并发会话**：同一用户在另一设备创建/接管活动会话时，原会话立即失效；原客户端收到冲突并停止提交。
- **过期会话**：到截止时间进入提交/宽限流程；宽限结束后服务器冻结答案快照。后续请求返回 `409 ATTEMPT_CLOSED`。
- **自动保存请求乱序**：客户端带 `expectedServerRevision`；版本不匹配返回 `409 REVISION_CONFLICT` 和当前 revision，客户端重新拉取，不允许旧请求覆盖新答案。
- **重复交卷**：同一 `Idempotency-Key` 返回第一次交卷结果；不同 key 对已经提交的 attempt 返回已有状态，不重复扣次数、不重复生成成绩。

### 4.2 重复提交、并发与状态机

- 组织审核、认证决定、考试发布、阅卷、岗位接受/拒绝、替换、签到纠正、赛后审核均要求状态前置条件和 `expectedVersion`。
- 两个审核员并发处理同一申请时只允许一个状态转换成功；另一个得到 `409 STATE_CHANGED` 并读取最新状态。
- 组织成员邀请码在事务中检查有效期、用途、scope 和剩余次数后原子消费；重放 token 不能超出 `maxUses`。
- 对象存储重复/乱序事件按 provider event ID、media intent 和当前状态幂等；已 rejected/expired/deleted 的对象不能因迟到事件复活。
- 状态变更成功时，业务行与 `audit_events` 同事务写入；若通知异步失败，状态不回滚，通知任务可重试且使用稳定 event key 去重。
- 岗位替换创建新的 assignment 记录并指向旧岗位历史；不得覆盖原裁判 ID 或其接受/拒绝记录。

### 4.3 大图与超大媒体上传

- **上传前**：客户端检查文件类型/大小作 UX 提示；API 再次校验所有限制。客户端检查不构成安全边界。
- **赛后照片压缩**：在浏览器端生成预览图；保留原图是用户选择项。压缩不得把原图覆盖为唯一文件；预览与原图分别申请 media intent 并关联同一记录。
- **超大图片**：若原图超过 20 MB 默认限制，禁止申请原图上传授权；仍允许在客户端尝试生成符合 2 MB 预览上限的压缩图。若浏览器内存不足/解码失败，保留原文件不上传，提示重拍或使用相机较低分辨率，不允许把文件转发给 API 压缩。
- **主观题图片**：前端先压缩并受独立的数量/尺寸/总大小限制；超限在提交前提示用户调整。图片对象必须在服务端核验 `available` 后，答卷才能引用；未完成上传不能假装提交成功。
- **视频/PDF/音频**：不能通过 API 中转或转码。视频需预处理成允许的浏览器兼容格式；超过各自上限在签发凭证前拒绝。
- **上传中断**：上传意图保留到期时间；支持同一 intent 重试或续签。multipart 分片只由浏览器发送至对象存储；过期分片由存储生命周期/清理任务清除。
- **完成回调丢失**：客户端可重试 `complete`；服务端执行 HEAD/stat 核验。后台定期扫描超时 pending intent 并核验对象，处理孤儿对象和悬挂记录。
- **内容类型伪造**：核对对象元数据、允许格式/扩展名和必要的文件签名；不信任原文件名或客户端 MIME。
- **服务端资源上限**：API 上传意图/回调请求体有界；数据库连接池和后台清理并发受限；测试验证 API 路径未接触媒体字节。

### 4.4 认证与权限边界

- 邮箱未验证不得执行要求验证的核心操作；过期/重放验证码返回统一失败，不泄露账号存在性。
- 认证员不能审核本人申请；组织认证检查申请人当前 active membership 和组织 active 状态。
- 成员离开组织后组织认证转 `suspended`，待处理申请冻结；重新加入后只恢复未撤销的原记录。
- 平台认证申请必须在申请时重新验证有效组织认证和成员关系；不能只相信客户端或旧 JWT claim。
- 认证撤销只影响新选派/新接受；历史考试成绩和履职记录不改写。
- 组织冻结禁止新业务；历史记录只读。管理员解冻必须审计并重新评估组织/角色有效性。
- 短时 URL 只在实时授权后签发；撤权后不能新签 URL。已签 URL 在 TTL 内仍可能有效，因此 TTL 必须短且不进入日志/缓存。

### 4.5 论坛和内容安全

- 富文本采用结构化白名单序列化，服务端重新清洗；拒绝 script、iframe、任意 HTML、危险 URL scheme 和可执行附件。
- 附件立即可见仅在同步基础校验成功后成立；上传对象不存在、状态 pending、类型/大小不符均阻止发帖发布。
- MVP 不承诺病毒扫描；允许类型必须采用保守白名单，下载/外链显示安全提示，举报后版主可隐藏或隔离。
- 删除帖子为软删除，处罚/申诉/恢复均留审计；限时编辑过期后作者只能提交更正或联系版主。

### 4.6 离线工具

- 工具会话只存设备本地；浏览器存储不可用/空间不足时明确提示，不静默丢弃。
- 计时器以开始时间、暂停累计和事件时间戳恢复，不能依赖后台 JS 定时器保持准确。
- 声音/震动不被浏览器支持或页面未授权时，提供视觉提示；不能因提醒失败影响计时状态。
- 用户删除/清空本地工作台时二次确认；导出文件明确提示可能含比赛数据。
- 规则版本变更只作用于新会话；旧会话固定规则版本，避免历史推算被新参数改写。

#### 工作台 UI 调整验收

视觉基线引用 [共享 UI 规范](../ui/macos_fiba.md)。场边操作页采用紧凑面板间距而非营销区块的大段留白；小字号的有效信息采用正文色而非低对比度辅助灰，这是为操作密度和可读性保留的窄范围例外，不改变品牌配色与组件形状。

- 创建、切换、比赛/进攻/暂停计时、球队犯规、快捷秒数、换节、日志、导出与确认删除流程保持可用；展示历史会话的规则版本标识。
- 缺失、非整数及越界参数不得创建会话，错误时保留表单；开始、暂停、恢复、重置计时均写入本地操作日志。
- 无活动会话时也显示存储错误及重试入口；读取失败不得自动改写旧数据，重试或用户确认清空后才能新建；保存失败保留当前内存会话并允许重试/导出，删除失败不提前移除当前界面中的会话。
- 320px 移动视口与桌面布局均无页面级横向溢出；操作目标至少 44×44 CSS px，数字输入具有可访问名称，弹窗支持键盘关闭和焦点恢复，计时到零有文字提示且不高频播报倒计时。
- 此前 UI 调整阶段未增加声音；后续队伍级比分、统计、暂停、联动和声音提示按[队伍级记录台规格](0003-team-scorer-console.md)扩展，仍不新增后端 API、同步或 Service Worker，不代表工具 Beta 全部需求已经完成。

## 5. Implementation Task List

> 以下为计划新增/修改的目标路径，均为相对仓库根目录；实施时先完成技术栈、数据库、API 框架和对象存储供应商 ADR，再按依赖顺序执行。每项任务限定一个可验证交付，不把整块业务写成单一大任务。

### Task 1：技术基线与共享契约骨架

- **依赖**：无；开始业务实现前必须先记录 API 框架、数据库、认证策略和对象存储供应商决策。
- **实现**：建立 workspace 的 `contracts`、`domain`、`api` 基础包；定义统一 API 错误、UUID/日期类型和响应封装。
- **文件**：`docs/decisions/0004-api-database-and-auth-stack.md`、`docs/decisions/0005-object-storage-provider.md`、`packages/contracts/src/common.ts`、`apps/api/src/app.ts`、`pnpm-workspace.yaml`。
- **测试**：`packages/contracts/test/common.test.ts` 验证错误 envelope/日期 schema；API smoke test 验证 health endpoint 与错误映射。

### Task 2：数据库迁移与事务测试基架

- **状态**：已实现；PostgreSQL 17 集成验证通过，使用方式见 [数据库说明](../../apps/api/db/README.md)。
- **依赖**：Task 1。
- **实现**：建立迁移、测试数据库清理、事务测试工具；落实连接池上限与低内存测试配置。
- **文件**：`apps/api/db/migrations/0001_core.sql`、`apps/api/src/infrastructure/database/pool.ts`、`apps/api/src/infrastructure/database/transaction.ts`、`apps/api/src/application/transaction.ts`、`apps/api/test/helpers/database.ts`、`apps/api/test/db/migration.test.ts`。
- **测试**：迁移可从空库执行/回滚；唯一约束、外键、事务回滚有效；测试数据库连接数受配置限制。

### Task 3：身份、邮箱验证与账号会话

- **状态**：已实现；部署变量与维护命令见 [认证部署配置](../../apps/api/db/AUTH_DEPLOYMENT.md)。
- **依赖**：Task 2。
- **实现**：用户、邮箱 challenge、可选密码、会话、凭据唯一性和邮箱验证门禁；短信接口先留 provider adapter，不阻塞邮箱登录。
- **文件**：`apps/api/db/migrations/0002_identity.sql`、`apps/api/src/modules/auth/*`、`packages/contracts/src/auth.ts`。
- **测试**：`apps/api/test/auth/email-challenge.test.ts`、`login.test.ts`、`credential-uniqueness.test.ts`；覆盖过期、重放、频控、邮箱未验证和重复凭据。

### Task 4：作用域 RBAC 与审计基础设施

- **状态**：已实现；范围、部署权限及后续模块接入见 [ADR 0014](../decisions/0014-scoped-authorization-and-audit-foundation.md) 和[授权与审计说明](../../apps/api/db/AUTHORIZATION_AUDIT.md)。提前创建组织/成员/赛事/比赛的最小归属与状态骨架用于真实 scope 查询，Task 7/15 再通过新增迁移扩展，不代表相应业务接口已实现。
- **依赖**：Task 3。
- **实现**：role bindings、组织/事件/比赛 scope resolver、Casbin 默认拒绝的角色/权限/目标与作用域匹配、纯领域状态约束、append-only audit writer。引擎迁移见 [ADR 0015](../decisions/0015-casbin-authorization-engine.md)，编码边界统一见[后端规约](../agents/coding-standards/backend.md#4-授权引擎与策略边界)。
- **文件**：`apps/api/db/migrations/0003_rbac_audit.sql`、`apps/api/src/modules/authorization/*`、`apps/api/src/infrastructure/authorization/casbin.ts`、`apps/api/src/modules/audit/*`、`packages/domain/src/permissions.ts`。
- **测试**：`apps/api/test/authorization/casbin.test.ts`、`casbin-matrix.test.ts`、`casbin-startup.test.ts`、`scope-matrix.test.ts`、`audit/append-only.test.ts` 及同目录独立 `.integration.test.ts`；覆盖完整角色/权限/目标矩阵、跨组织 ID、真实归属解析、撤权/成员退出/冻结即时生效、自身资源、非法角色范围、并发授予、同事务审计回滚、不可变限制、查询分页与 Cookie HTTP 门禁。
- **引擎迁移验收**：现有权限结果、Cookie 和 403/404 行为保持兼容；self 不生成角色绑定；未知权限默认拒绝；多个绑定不得拼接角色和范围；同一引擎处理不同用户/组织的交错请求不得串权；引擎异常不得继续业务操作或返回已读取的受保护数据。固定策略随部署更新，数据库角色撤销与成员/组织现状仍在下一次请求生效；无需修改数据库结构或迁移历史。

### Task 5：对象存储 adapter 与媒体上传意图

- **状态**：控制面已实现，真实 OSS 与后续业务授权接入待验收；具体可用范围及检查记录见 [FS-0014](0014-media-control-plane.md)，部署见[媒体说明](../../apps/api/db/MEDIA_DEPLOYMENT.md)。
- **依赖**：Task 2、Task 4、Task 1 的供应商 ADR。
- **实现**：媒体表、服务端 object key 生成、策略配置、短时签名、complete HEAD/stat 校验、事件幂等与孤儿清理接口。
- **文件**：`apps/api/db/migrations/0004_media.sql`、`apps/api/src/modules/media/*`、`apps/api/src/providers/object-storage/*`、`packages/contracts/src/media.ts`。
- **测试**：`apps/api/test/media/upload-intent.test.ts`、`completion-idempotency.test.ts`、`scope-authorization.test.ts`；断言 API 不接收文件字节。

### Task 6：前端直传与客户端图片压缩工具

- **状态**：已交付可复用状态用例、API、浏览器压缩和上传部件；尚无完整业务页面的预览/原图选择交互，不代表认证/考试/赛后流程已上线，见 [FS-0014](0014-media-control-plane.md)。
- **依赖**：Task 5。
- **实现**：客户端 file policy 校验、赛后预览压缩、可选原图、直传/重试/完成确认 UI；服务端限制仍为最终权威。
- **文件**：`packages/domain/src/media-policy.ts`、`apps/referee-web/src/features/media/*`、`apps/referee-web/src/features/media/image-compression.ts`。
- **测试**：`packages/domain/test/media-policy.test.ts`、`apps/referee-web/test/image-compression.test.ts`、`direct-upload-state.test.ts`；覆盖边界体积、解码失败、超大原图和网络中断。

### Task 7：组织、邀请、成员关系与平台审核

- **迁移接续**：Task 4 已建立组织/成员最小归属与状态骨架；本任务以 `0005` 扩展现有表并补齐业务字段/约束，不重复建表。
- **依赖**：Task 3、Task 4。
- **实现**：组织申请、平台审核、一次性创建邀请码、成员邀请接受/拒绝/申请/成员码、角色授予/撤销、组织冻结/所有权变更审计。
- **文件**：`apps/api/db/migrations/0005_organizations.sql`、`apps/api/src/modules/organizations/*`、`packages/contracts/src/organizations.ts`。
- **测试**：`apps/api/test/organizations/review-gating.test.ts`、`membership-flows.test.ts`、`invitation-response.test.ts`、`invite-usage.test.ts`、`freeze.test.ts`；覆盖未审核组织零权限、邀请码并发消费和不同用途 token 隔离。

### Task 8：认证记录、私有证据和申诉

- **依赖**：Task 5、Task 7。
- **实现**：平台/组织认证数据、scope 检查、当前成员校验、审核队列、撤销/暂停/申诉、原件短时访问审计。
- **文件**：`apps/api/db/migrations/0006_certifications.sql`、`apps/api/src/modules/certifications/*`、`packages/contracts/src/certifications.ts`。
- **测试**：`apps/api/test/certifications/organization-scope.test.ts`、`platform-prerequisite.test.ts`、`self-review-denial.test.ts`、`appeal-reviewer-separation.test.ts`、`membership-suspension.test.ts`。

### Task 9：学习分类、内容版本与媒体发布

- **依赖**：Task 5、Task 4。
- **实现**：三级分类、多对多挂载、资料版本、发布/下线和下载策略；只允许引用 available media。
- **文件**：`apps/api/db/migrations/0007_learning_assets.sql`、`apps/api/src/modules/learning/*`、`packages/contracts/src/learning.ts`。
- **测试**：`apps/api/test/learning/category-depth.test.ts`、`asset-version-immutability.test.ts`、`download-policy.test.ts`；覆盖第 4 层拒绝和下线后旧快照可读。

### Task 10：题型、题目版本与练习判分

- **依赖**：Task 9。
- **实现**：单选/判断/多选/主观题 schema、answer key 访问隔离、客观精确判分、练习即时反馈、练习历史与错题连续正确规则。
- **文件**：`apps/api/db/migrations/0008_questions_practice.sql`、`apps/api/src/modules/questions/*`、`apps/api/src/modules/practice/*`、`packages/domain/src/scoring.ts`。
- **测试**：`packages/domain/test/scoring.test.ts`、`wrong-question-mastery.test.ts`、`apps/api/test/questions/answer-key-access.test.ts`；覆盖部分多选不计分及连续答错归零。

### Task 11：考试快照、策略校验与发布

- **依赖**：Task 10、Task 9。
- **实现**：考试版本、题目快照、固定顺序/选项随机策略、报名/时限/尝试/权重/展示规则和发布完整性校验。
- **文件**：`apps/api/db/migrations/0009_exams.sql`、`apps/api/src/modules/exams/publish.ts`、`apps/api/src/modules/exams/policy.ts`、`packages/contracts/src/exams.ts`。
- **测试**：`apps/api/test/exams/publish-validation.test.ts`、`snapshot-immutability.test.ts`、`weighted-scoring.test.ts`；覆盖非法权重、缺失媒体、版本冻结和归一化边界。

### Task 12：正式考试 attempt、自动保存与交卷

- **依赖**：Task 11、Task 5。
- **实现**：单活动会话、服务端 deadline、逐题 revision 保存、固定宽限窗口、原子扣次数、幂等交卷和考试汇总。
- **文件**：`apps/api/src/modules/exams/attempts/*`、`apps/api/db/migrations/0010_exam_attempts.sql`、`apps/referee-web/src/features/exams/attempt/*`。
- **测试**：`apps/api/test/exams/attempt-concurrency.test.ts`、`autosave-revision.test.ts`、`submit-idempotency.test.ts`、`deadline-grace.test.ts`；覆盖双设备、乱序保存、重复提交、过期和零分空题。

### Task 13：主观题阅卷与管理员改判

- **依赖**：Task 12、Task 4。
- **实现**：授权阅卷队列、0..满分校验、评语、提交即生效、考试汇总重算和改判追加审计。
- **文件**：`apps/api/db/migrations/0011_grading.sql`、`apps/api/src/modules/grading/*`。
- **测试**：`apps/api/test/grading/score-boundary.test.ts`、`review-scope.test.ts`、`override-audit.test.ts`、`exam-aggregation.test.ts`。

### Task 14：学习个人状态与客户端缓存

- **依赖**：Task 9、Task 10。
- **实现**：收藏、最近访问、错题/历史查询 API；PWA 只缓存目录/封面/最近访问摘要，不缓存答卷或私有媒体。
- **文件**：`apps/api/db/migrations/0012_study-state.sql`、`apps/api/src/modules/study-state/*`、`apps/referee-web/src/pwa/cache-policy.ts`。
- **测试**：`apps/api/test/study-state/ownership.test.ts`、`apps/referee-web/test/pwa/private-cache-denylist.test.ts`、`stale-state-retry.test.ts`。

### Task 15：赛事岗位模板与发布锁定

- **迁移接续**：Task 4 已建立赛事/比赛最小归属与状态骨架；本任务以 `0013` 扩展现有表并补齐业务字段/约束，不重复建表。
- **依赖**：Task 7、Task 8、Task 4。
- **实现**：事件/比赛/岗位模板、候选成员过滤、认证范围提示、越过理由、发布锁定、岗位回应和替换链。
- **文件**：`apps/api/db/migrations/0013_competitions_assignments.sql`、`apps/api/src/modules/assignments/*`、`packages/domain/src/assignment-state.ts`。
- **测试**：`packages/domain/test/assignment-state.test.ts`、`apps/api/test/assignments/organization-boundary.test.ts`、`publish-lock.test.ts`、`qualification-override.test.ts`、`replacement-history.test.ts`。

### Task 16：赛程通知、签到和赛后记录

- **依赖**：Task 15、Task 5。
- **实现**：站内通知/email adapter、动态签到码、签到纠正审计、主裁记录提交/裁判长接管、退回/归档、原图可选策略。
- **文件**：`apps/api/db/migrations/0014_attendance_records.sql`、`apps/api/src/modules/attendance/*`、`apps/api/src/modules/post-game-records/*`、`apps/api/src/modules/notifications/*`。
- **测试**：`apps/api/test/attendance/code-window.test.ts`、`correction-audit.test.ts`、`apps/api/test/post-game-records/takeover.test.ts`、`review-and-return.test.ts`、`late-record.test.ts`；email provider 用 fake adapter 测重试/去重。

### Task 17：离线比赛工作台与规则版本

- **依赖**：Task 1 的纯领域包约定；不依赖业务 API。
- **实现**：本地工作台存储、时间戳计时恢复、多计时器、犯规/事件日志、规则版本快照、导出/删除。
- **文件**：`packages/domain/src/court-tools/*`、`apps/referee-web/src/features/court-tools/*`、`apps/referee-web/src/features/court-tools/storage.ts`。
- **测试**：`packages/domain/test/court-tools/timer-recovery.test.ts`、`rule-version.test.ts`、`apps/referee-web/test/court-tools/storage-quota.test.ts`、`export-delete.test.ts`。

### Task 18：GB 2312 区位码工具

- **依赖**：无业务 API 依赖；工具数据/标准实现需先确认来源和许可。
- **实现**：汉字双向查询、区位码/国标码/机内码、ASCII/符号和批量转换。
- **文件**：`packages/domain/src/gb2312/*`、`apps/referee-web/src/features/gb2312/*`。
- **测试**：`packages/domain/test/gb2312/round-trip.test.ts`、`boundary-cases.test.ts`、`batch-input.test.ts`；覆盖未收录字符和非法输入。

### Task 19：论坛、附件发布与版主管理

- **依赖**：Task 5、Task 4、Task 3。
- **实现**：板块、白名单富文本清洗、附件同步校验、发帖回复/点赞收藏/举报、软删除、限时编辑、禁言封禁和申诉。
- **文件**：`apps/api/db/migrations/0015_forum.sql`、`apps/api/src/modules/forum/*`、`apps/api/src/modules/moderation/*`、`apps/referee-web/src/features/forum/*`。
- **测试**：`apps/api/test/forum/rich-text-sanitization.test.ts`、`attachment-validation.test.ts`、`edit-window.test.ts`、`soft-delete-audit.test.ts`、`apps/api/test/moderation/appeal-scope.test.ts`。

### Task 20：端到端权限矩阵与发布验收

- **依赖**：Task 1–19 中纳入首发的全部功能。
- **实现**：将正式/Beta 标签、feature flags、运营告警、对象存储 pending 清理、数据库连接上限和 Nginx 静态部署配置连成发布检查表。
- **文件**：`apps/api/test/integration/mvp-authorization-matrix.test.ts`、`apps/api/test/integration/media-lifecycle.test.ts`、`deploy/nginx/site.conf`、`deploy/production.env.example`、`docs/specs/0002-mvp-platform-feature.md`。
- **测试**：跨组织读写拒绝矩阵、token 后角色撤销、上传事件重放、考试/选派并发状态、静态 SPA 路由和生产构建 smoke test；确认单测配置内存低于 300 MB，生产构建不在 2C2G 主机运行。
