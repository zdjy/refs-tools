<script setup lang="ts">
  /**
   * 窄屏记录列表（FS-0034 §3）：触屏没有 hover，表格的多列投影在这里改为卡片，
   * 标题 + 状态标签 + 具名字段（字段名 + 值）+ 一行常显的文字按钮，避免横向滚动。
   *
   * 只负责排版与空态，字段与动作由页面 `*.presentation.ts` 提供；
   * 表头顺序、列宽等桌面规则仍由 `AdminDataTable` 负责，两者共用同一份动作描述。
   */
  import { NButton } from 'naive-ui';
  import AdminBadge from './AdminBadge.vue';
  import AdminConfirmButton from './AdminConfirmButton.vue';
  import AdminIcon from './AdminIcon.vue';
  import type { AdminRecordCard, RecordAction } from './record-card';

  /** 模板里无法在 v-if/v-else 之间收窄联合类型，这里单独判断危险色。 */
  const isDanger = (action: RecordAction) => action.kind === 'action' && !!action.danger;

  const props = withDefaults(
    defineProps<{ cards: AdminRecordCard[]; emptyText?: string; emptyHint?: string }>(),
    { emptyText: '暂无数据', emptyHint: undefined }
  );
</script>

<template>
  <div class="record-list-card">
    <ul v-if="cards.length" class="record-list">
      <li v-for="card in cards" :key="card.key" class="record-item">
        <div class="record-head">
          <button v-if="card.onOpen" type="button" class="record-title" @click="card.onOpen">
            {{ card.title }}
          </button>
          <span v-else class="record-title is-static">{{ card.title }}</span>
          <span v-if="card.badges?.length" class="record-badges">
            <AdminBadge
              v-for="badge in card.badges"
              :key="`${card.key}-${badge.label}`"
              :tone="badge.tone"
              :variant="badge.variant"
            >
              {{ badge.label }}
            </AdminBadge>
          </span>
        </div>

        <dl v-if="card.fields.length" class="record-fields">
          <div v-for="field in card.fields" :key="`${card.key}-${field.label}`" class="record-field">
            <dt>{{ field.label }}</dt>
            <dd>{{ field.value }}</dd>
          </div>
        </dl>

        <div v-if="card.actions.length" class="record-actions">
          <template v-for="(action, index) in card.actions" :key="`${card.key}-${index}`">
            <AdminConfirmButton
              v-if="action.kind === 'confirm'"
              variant="row"
              :label="action.label"
              :icon="action.icon"
              :message="action.message"
              :confirm-label="action.confirmLabel ?? action.label"
              :tone="action.tone === 'primary' ? 'primary' : 'danger'"
              :disabled="action.disabled"
              @confirm="action.onConfirm"
            />
            <NButton
              v-else
              size="small"
              quaternary
              :disabled="action.disabled"
              :class="['admin-row-action-button', isDanger(action) ? 'is-danger' : '']"
              @click="action.onClick"
            >
              <AdminIcon :name="action.icon" :size="14" />
              <span class="admin-row-action-label">{{ action.label }}</span>
            </NButton>
          </template>
        </div>
      </li>
    </ul>

    <div v-else class="record-empty">
      <p class="record-empty-title">{{ props.emptyText }}</p>
      <p v-if="props.emptyHint" class="record-empty-hint">{{ props.emptyHint }}</p>
    </div>
  </div>
</template>

<style scoped>
  .record-list-card {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .record-list {
    display: flex;
    flex-direction: column;
    gap: var(--admin-space-md);
  }

  .record-item {
    display: flex;
    flex-direction: column;
    gap: var(--admin-space-xs);
    padding: var(--admin-space-lg);
    background: var(--admin-surface);
    border: 1px solid var(--admin-line);
    border-radius: var(--admin-radius-md);
    box-shadow: var(--admin-shadow);
  }

  .record-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--admin-space-md);
  }

  .record-title {
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--admin-ink);
    font: inherit;
    font-weight: var(--admin-text-body-strong-weight);
    text-align: left;
    overflow-wrap: anywhere;
    cursor: pointer;
  }

  .record-title.is-static {
    cursor: default;
  }

  .record-title:not(.is-static):hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .record-badges {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--admin-space-xs);
    flex: none;
  }

  .record-fields {
    display: flex;
    flex-direction: column;
    gap: var(--admin-space-xs);
    margin: 0;
  }

  /* 字段名左、值右：名称用 meta 字号但保持 body 色，值用 ink 以便扫读。 */
  .record-field {
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr);
    gap: var(--admin-space-md);
    align-items: baseline;
  }

  .record-field dt {
    font-size: var(--admin-text-meta-size);
    line-height: var(--admin-text-meta-leading);
    color: var(--admin-body);
  }

  .record-field dd {
    margin: 0;
    font-size: var(--admin-text-body-size);
    line-height: var(--admin-text-body-leading);
    color: var(--admin-ink);
    overflow-wrap: anywhere;
  }

  .record-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--admin-space-sm);
    margin-top: var(--admin-space-sm);
    padding-top: var(--admin-space-md);
    border-top: 1px solid var(--admin-line);
  }

  .record-empty {
    display: flex;
    flex-direction: column;
    gap: var(--admin-space-xs);
    padding: var(--admin-space-xxl);
    background: var(--admin-surface);
    border: 1px solid var(--admin-line);
    border-radius: var(--admin-radius-md);
    text-align: center;
  }

  .record-empty-title {
    font-size: var(--admin-text-body-size);
    color: var(--admin-ink);
  }

  .record-empty-hint {
    font-size: var(--admin-text-meta-size);
    color: var(--admin-body);
  }

</style>
