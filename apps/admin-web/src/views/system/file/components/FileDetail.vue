<script setup lang="ts">
  /**
   * 文件详情字段区：只负责呈现与下载理由输入。
   * 删除需要理由与审计，入口在列表行并打开独立的删除弹窗（FS-0034）。
   */
  import { NFormItem, NInput } from 'naive-ui';
  import type { AdminMedia } from '@refs-tools/contracts/admin-media';
  import { formatBytes, formatTime, ownerLabel, purposeLabel, retained, statusLabel } from '../files.presentation';

  defineProps<{ file: AdminMedia; reason: string; busy: boolean }>();
  defineEmits<{ 'update:reason': [value: string] }>();

  const rows = (file: AdminMedia) => [
    { label: '文件名', value: file.fileName ?? '未命名文件' },
    { label: '文件 ID', value: file.id },
    { label: '所属用户', value: ownerLabel(file) },
    { label: '所属用户 ID', value: file.ownerUserId },
    { label: '用途 / 状态', value: `${purposeLabel(file.purpose)} / ${statusLabel(file.status)}` },
    { label: '关联目标', value: `${file.target.type} / ${file.target.id ?? '平台'}` },
    { label: '类型', value: file.contentType },
    { label: '声明大小', value: `${formatBytes(file.expectedSizeBytes)}（${file.expectedSizeBytes} 字节）` },
    {
      label: '核验大小',
      value:
        file.verifiedSizeBytes === null
          ? formatBytes(null)
          : `${formatBytes(file.verifiedSizeBytes)}（${file.verifiedSizeBytes} 字节）`,
    },
    { label: '创建 / 上传意图到期', value: `${formatTime(file.createdAt)} / ${formatTime(file.expiresAt)}` },
    { label: '核验 / 逻辑删除', value: `${formatTime(file.verifiedAt)} / ${formatTime(file.deletedAt)}` },
    { label: '维护清理记录', value: `${formatTime(file.cleanedAt)}（无记录不表示对象仍存在）` },
  ];
</script>

<template>
  <div class="detail">
    <section class="detail-note" aria-label="留存要求">
      <p v-if="retained(file)" class="detail-line is-warning">
        已核验的证据须按所属业务审批留存，不能在此通用删除。
      </p>
      <p v-if="file.status === 'deleted'" class="detail-line is-info">
        文件访问已撤销。若上次对象删除失败，可在列表行再次触发删除并填写理由重试。
      </p>
    </section>

    <dl class="detail-grid">
      <div v-for="row in rows(file)" :key="row.label" class="detail-field">
        <dt>{{ row.label }}</dt>
        <dd class="detail-value">{{ row.value }}</dd>
      </div>
    </dl>

    <NFormItem label="下载理由" required>
      <NInput
        :value="reason"
        type="textarea"
        :maxlength="500"
        show-count
        :disabled="busy"
        :input-props="{ 'aria-label': '文件操作理由' }"
        placeholder="说明本次管理操作的必要性，请勿填写凭据或 URL"
        @update:value="$emit('update:reason', $event)"
      />
    </NFormItem>

    <p class="detail-hint">
      下载链接仅短时有效，文件由浏览器直接从对象存储下载，不进行在线预览。下载内容可能含私有资料，请妥善保管。
    </p>
  </div>
</template>

<style scoped>
  .detail {
    display: flex;
    flex-direction: column;
    gap: var(--admin-space-lg);
    min-width: 0;
  }

  .detail-note:empty {
    display: none;
  }

  .detail-line {
    padding: var(--admin-space-md) var(--admin-space-lg);
    border-radius: var(--admin-radius-md);
    font-size: var(--admin-text-body-size);
    line-height: var(--admin-text-body-leading);
  }

  .detail-line.is-warning {
    background: var(--admin-status-warning);
    color: var(--admin-warning);
  }

  .detail-line.is-info {
    background: var(--admin-surface-muted);
    color: var(--admin-body);
  }

  /* 只读字段：12px muted 标签在上、13px ink 值在下，不用分隔线堆叠（§5.2）。 */
  .detail-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--admin-space-lg) var(--admin-space-xl);
    min-width: 0;
  }

  .detail-field {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  dt {
    font-size: var(--admin-text-meta-size);
    line-height: var(--admin-text-meta-leading);
    color: var(--admin-muted);
  }

  .detail-value {
    min-width: 0;
    font-size: var(--admin-text-body-size);
    line-height: var(--admin-text-body-leading);
    color: var(--admin-ink);
    overflow-wrap: anywhere;
  }

  .detail-hint {
    font-size: var(--admin-text-meta-size);
    line-height: var(--admin-text-meta-leading);
    color: var(--admin-muted);
  }

  @media (min-width: 768px) {
    .detail-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
