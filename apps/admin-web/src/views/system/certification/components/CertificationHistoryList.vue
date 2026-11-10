<script setup lang="ts">
  /** 办理历史与申诉记录：折叠呈现，只读。 */
  import { NCollapse, NCollapseItem } from 'naive-ui';
  import type { CertificationAppeal, CertificationHistory } from '@refs-tools/contracts/certifications';
  import { decisionLabels, statusLabels } from '../certifications.presentation';

  defineProps<{ history: CertificationHistory[]; appeals: CertificationAppeal[] }>();
</script>

<template>
  <NCollapse>
    <NCollapseItem title="办理历史" name="history">
      <ul class="list">
        <li v-for="item in history" :key="item.record.version">
          版本 {{ item.record.version }} · {{ statusLabels[item.record.status] }} ·
          {{ new Date(item.createdAt).toLocaleString('zh-CN') }}
          <p v-if="item.record.reviewNote" class="meta">{{ item.record.reviewNote }}</p>
        </li>
      </ul>
    </NCollapseItem>
    <NCollapseItem title="申诉记录" name="appeals">
      <ul class="list">
        <li v-for="item in appeals" :key="item.id">
          <p class="text">{{ item.reason }}</p>
          <p class="meta">
            {{ item.status === 'pending' ? '待复核' : item.decision ? decisionLabels[item.decision] : '已处理' }} ·
            {{ item.reviewReason }}
          </p>
        </li>
      </ul>
    </NCollapseItem>
  </NCollapse>
</template>

<style scoped>
  .list {
    display: flex;
    flex-direction: column;
    gap: var(--admin-space-md);
    font-size: var(--admin-text-body-size);
    line-height: var(--admin-text-body-leading);
    color: var(--admin-body);
  }

  .text {
    font-size: var(--admin-text-body-size);
    line-height: var(--admin-text-body-leading);
    color: var(--admin-body);
    white-space: pre-line;
    overflow-wrap: anywhere;
  }

  .meta {
    font-size: var(--admin-text-meta-size);
    line-height: var(--admin-text-meta-leading);
    color: var(--admin-muted);
    overflow-wrap: anywhere;
  }
</style>
