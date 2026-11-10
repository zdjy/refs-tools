<template>
  <NCard :segmented="{ content: true }" :bordered="false" size="small">
    <template #header>
      <NSpace>
        <NDropdown trigger="hover" :options="addOptions" @select="(key: string) => emit('add', key)">
          <NButton type="info" ghost icon-placement="right">
            添加菜单
            <template #icon>
              <span class="icon-slot">
                <NIcon size="14"><DownOutlined /></NIcon>
              </span>
            </template>
          </NButton>
        </NDropdown>
        <NButton type="info" ghost icon-placement="left" @click="emit('toggle-all')">
          全部{{ expanded.length ? '收起' : '展开' }}
          <template #icon>
            <span class="icon-slot">
              <NIcon size="14"><AlignLeftOutlined /></NIcon>
            </span>
          </template>
        </NButton>
      </NSpace>
    </template>

    <div class="tree-panel">
      <NInput :value="pattern" placeholder="输入菜单名称搜索" @update:value="emit('update:pattern', $event)">
        <template #suffix>
          <NIcon size="18"><SearchOutlined /></NIcon>
        </template>
      </NInput>
      <div class="tree-body">
        <div v-if="loading" class="tree-loading" role="status">
          <NSpin size="medium" />
        </div>
        <NTree
          v-else
          block-line
          cascade
          checkable
          :virtual-scroll="true"
          :pattern="pattern"
          :data="tree as unknown as TreeOption[]"
          :expanded-keys="expanded"
          class="tree"
          @update:selected-keys="emit('select', $event as string[])"
          @update:expanded-keys="emit('update:expanded', $event as string[])"
        />
      </div>
    </div>
  </NCard>
</template>

<script lang="ts" setup>
  /** 菜单树面板：搜索、展开/收起、添加菜单入口。Mock 页专用展示组件。 */
  import {
    NButton,
    NCard,
    NDropdown,
    NIcon,
    NInput,
    NSpace,
    NSpin,
    NTree,
    type TreeOption,
  } from 'naive-ui';
  import { AlignLeftOutlined, DownOutlined, SearchOutlined } from '@vicons/antd';
  import type { ListDate } from '@/api/system/menu';

  defineProps<{
    tree: ListDate[];
    loading: boolean;
    pattern: string;
    expanded: string[];
    addOptions: { label: string; key: string; disabled: boolean }[];
  }>();
  const emit = defineEmits<{
    add: [key: string];
    'toggle-all': [];
    select: [keys: string[]];
    'update:pattern': [value: string];
    'update:expanded': [keys: string[]];
  }>();
</script>

<style scoped>
  .tree-panel {
    display: flex;
    flex-direction: column;
    gap: var(--admin-space-lg);
    width: 100%;
  }

  .tree-body {
    padding-block: var(--admin-space-lg);
    min-height: 120px;
  }

  .tree-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-block: var(--admin-space-xl);
  }

  .tree {
    max-height: 650px;
    overflow: hidden;
  }

  .icon-slot {
    display: flex;
    align-items: center;
  }
</style>
