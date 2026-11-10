<script setup lang="ts">
  /**
   * 界面设置抽屉（FS-0010 v2 §4.6）。
   *
   * 只保留仍然生效的选项：主题、表格密度、侧栏收起、关于。
   * 导航模式、标签栏、动画类型、面包屑与页脚等已固定或移除的选项不再出现。
   */
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { NDrawer, NDrawerContent } from 'naive-ui';
  import { useDesignSettingStore } from '@/store/modules/designSetting';
  import type { AdminDensity } from '@/settings/uiScale';
  import AdminIconButton from './AdminIconButton.vue';
  import AdminSegmented from './AdminSegmented.vue';
  import AdminSwitch from './AdminSwitch.vue';

  const props = defineProps<{ show: boolean }>();
  const emit = defineEmits<{ 'update:show': [value: boolean] }>();

  const { t } = useI18n();
  const designStore = useDesignSettingStore();

  const visible = computed({
    get: () => props.show,
    set: (value: boolean) => emit('update:show', value),
  });

  const densityOptions: { value: AdminDensity; label: string }[] = [
    { value: 'compact', label: t('layout.setting.densityCompact') },
    { value: 'comfortable', label: t('layout.setting.densityComfortable') },
  ];
  const themeOptions = computed(() => [
    { value: 'light', label: t('layout.setting.light') },
    { value: 'dark', label: t('layout.setting.dark') },
  ]);
  const themeValue = computed(() => (designStore.darkTheme ? 'dark' : 'light'));

  function setTheme(value: string) {
    designStore.setDarkTheme(value === 'dark');
  }

  const buildTime = import.meta.env.VITE_BUILD_TIME ?? '—';
  const version = import.meta.env.VITE_APP_VERSION ?? '3.0.0';
</script>

<template>
  <NDrawer v-model:show="visible" :width="360" placement="right">
    <NDrawerContent :title="t('layout.setting.title')" closable :native-scrollbar="false">
      <section class="setting-section">
        <h3 class="setting-section-title">{{ t('layout.setting.appearance') }}</h3>

        <div class="setting-row">
          <div class="setting-copy">
            <span class="setting-label">{{ t('layout.setting.theme') }}</span>
            <span class="setting-hint">{{ t('layout.setting.themeHint') }}</span>
          </div>
          <AdminSegmented
            :options="themeOptions"
            :value="themeValue"
            :label="t('layout.setting.theme')"
            @update:value="setTheme"
          />
        </div>

        <div class="setting-row">
          <div class="setting-copy">
            <span class="setting-label">{{ t('layout.setting.density') }}</span>
            <span class="setting-hint">{{ t('layout.setting.densityHint') }}</span>
          </div>
          <AdminSegmented
            :options="densityOptions"
            :value="designStore.density"
            :label="t('layout.setting.density')"
            @update:value="designStore.setDensity($event as AdminDensity)"
          />
        </div>

        <div class="setting-row">
          <div class="setting-copy">
            <span class="setting-label">{{ t('layout.setting.siderCollapsed') }}</span>
            <span class="setting-hint">{{ t('layout.setting.siderCollapsedHint') }}</span>
          </div>
          <AdminSwitch
            :checked="designStore.siderCollapsed"
            :label="t('layout.setting.siderCollapsed')"
            @update:checked="designStore.setSiderCollapsed($event)"
          />
        </div>
      </section>

      <section class="setting-section">
        <h3 class="setting-section-title">{{ t('layout.setting.about') }}</h3>
        <dl class="about-list">
          <div>
            <dt>{{ t('layout.setting.version') }}</dt>
            <dd>{{ version }}</dd>
          </div>
          <div>
            <dt>{{ t('layout.setting.buildTime') }}</dt>
            <dd>{{ buildTime }}</dd>
          </div>
        </dl>
      </section>

      <template #footer>
        <div class="drawer-footer">
          <AdminIconButton
            icon="close"
            :label="t('layout.setting.close')"
            @click="visible = false"
          />
        </div>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
  .setting-section + .setting-section {
    margin-top: var(--admin-space-xxl);
  }

  .setting-section-title {
    margin-bottom: var(--admin-space-lg);
    font-size: var(--admin-text-meta-size);
    font-weight: var(--admin-text-table-head-weight);
    color: var(--admin-muted);
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--admin-space-lg);
    min-height: var(--admin-control-height);
  }

  .setting-row + .setting-row {
    margin-top: var(--admin-space-lg);
  }

  .setting-copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .setting-label {
    font-size: var(--admin-text-body-size);
    color: var(--admin-ink);
  }

  .setting-hint {
    font-size: var(--admin-text-meta-size);
    color: var(--admin-muted);
  }

  .about-list {
    display: grid;
    gap: var(--admin-space-xs);
    margin: 0;
    font-size: var(--admin-text-meta-size);
  }

  .about-list div {
    display: flex;
    gap: var(--admin-space-md);
  }

  .about-list dt {
    color: var(--admin-muted);
  }

  .about-list dd {
    margin: 0;
    color: var(--admin-body);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  .drawer-footer {
    display: flex;
    justify-content: flex-end;
  }

</style>
