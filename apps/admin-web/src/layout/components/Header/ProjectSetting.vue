<template>
  <n-drawer v-model:show="isDrawer" :width="width" :placement="placement">
    <n-drawer-content :title="drawerTitle" :native-scrollbar="false">
      <div class="drawer">
        <n-divider title-placement="center">{{ t('layout.setting.theme') }}</n-divider>

        <div class="justify-center drawer-setting-item dark-switch">
          <n-tooltip placement="bottom">
            <template #trigger>
              <n-switch v-model:value="designStore.darkTheme" class="dark-theme-switch">
                <template #checked>
                  <n-icon size="14" color="var(--admin-warning)">
                    <SunnySharp />
                  </n-icon>
                </template>
                <template #unchecked>
                  <n-icon size="14" color="var(--admin-warning)">
                    <Moon />
                  </n-icon>
                </template>
              </n-switch>
            </template>
            <span>{{ designStore.darkTheme ? t('layout.setting.darkTheme') : t('layout.setting.lightTheme') }}</span>
          </n-tooltip>
        </div>

        <n-divider title-placement="center">{{ t('layout.setting.navMode') }}</n-divider>

        <div class="drawer-setting-item align-items-top">
          <div class="drawer-setting-item-style align-items-top">
            <n-tooltip placement="top">
              <template #trigger>
                <img
                  src="~@/assets/images/nav-theme-dark.svg"
                  @click="togNavMode('vertical')"
                  :alt="t('layout.setting.navModeVertical')"
                />
              </template>
              <span>{{ t('layout.setting.navModeVertical') }}</span>
            </n-tooltip>
            <n-badge dot color="var(--admin-primary)" v-show="settingStore.navMode === 'vertical'" />
          </div>

          <div class="drawer-setting-item-style">
            <n-tooltip placement="top">
              <template #trigger>
                <img
                  src="~@/assets/images/nav-horizontal.svg"
                  :alt="t('layout.setting.navModeHorizontal')"
                  @click="togNavMode('horizontal')"
                />
              </template>
              <span>{{ t('layout.setting.navModeHorizontal') }}</span>
            </n-tooltip>
            <n-badge dot color="var(--admin-primary)" v-show="settingStore.navMode === 'horizontal'" />
          </div>

          <div class="drawer-setting-item-style">
            <n-tooltip placement="top">
              <template #trigger>
                <img
                  src="~@/assets/images/nav-horizontal-mix.svg"
                  @click="togNavMode('horizontal-mix')"
                  :alt="t('layout.setting.navModeHorizontalMix')"
                />
              </template>
              <span>{{ t('layout.setting.navModeHorizontalMix') }}</span>
            </n-tooltip>
            <n-badge dot color="var(--admin-primary)" v-show="settingStore.navMode === 'horizontal-mix'" />
          </div>
        </div>

        <n-divider title-placement="center">{{ t('layout.setting.interfaceFunction') }}</n-divider>

        <div class="drawer-setting-item">
          <div class="drawer-setting-item-title"> {{ t('layout.setting.splitMenu') }} </div>
          <div class="drawer-setting-item-action">
            <n-switch
              :disabled="settingStore.navMode !== 'horizontal-mix'"
              v-model:value="settingStore.menuSetting.mixMenu"
            />
          </div>
        </div>

        <div class="drawer-setting-item">
          <div class="drawer-setting-item-title"> {{ t('layout.setting.fixedHeader') }} </div>
          <div class="drawer-setting-item-action">
            <n-switch v-model:value="settingStore.headerSetting.fixed" />
          </div>
        </div>

        <!--        <div class="drawer-setting-item">-->
        <!--          <div class="drawer-setting-item-title">-->
        <!--            固定侧边栏-->
        <!--          </div>-->
        <!--          <div class="drawer-setting-item-action">-->
        <!--            <n-switch v-model:value="settingStore.menuSetting.fixed" />-->
        <!--          </div>-->
        <!--        </div>-->

        <div class="drawer-setting-item">
          <div class="drawer-setting-item-title"> {{ t('layout.setting.fixedTabs') }} </div>
          <div class="drawer-setting-item-action">
            <n-switch v-model:value="settingStore.multiTabsSetting.fixed" />
          </div>
        </div>

        <n-divider title-placement="center">{{ t('layout.setting.interfaceDisplay') }}</n-divider>

        <div class="drawer-setting-item">
          <div class="drawer-setting-item-title"> {{ t('layout.setting.showReloadButton') }} </div>
          <div class="drawer-setting-item-action">
            <n-switch v-model:value="settingStore.headerSetting.isReload" />
          </div>
        </div>

        <div class="drawer-setting-item">
          <div class="drawer-setting-item-title"> {{ t('layout.setting.showBreadcrumb') }} </div>
          <div class="drawer-setting-item-action">
            <n-switch v-model:value="settingStore.crumbsSetting.show" />
          </div>
        </div>

        <div class="drawer-setting-item">
          <div class="drawer-setting-item-title"> {{ t('layout.setting.showBreadcrumbIcon') }} </div>
          <div class="drawer-setting-item-action">
            <n-switch v-model:value="settingStore.crumbsSetting.showIcon" />
          </div>
        </div>

        <div class="drawer-setting-item">
          <div class="drawer-setting-item-title"> {{ t('layout.setting.showTabs') }} </div>
          <div class="drawer-setting-item-action">
            <n-switch v-model:value="settingStore.multiTabsSetting.show" />
          </div>
        </div>
        <!--1.15废弃，没啥用，占用操作空间-->
        <!--        <div class="drawer-setting-item">-->
        <!--          <div class="drawer-setting-item-title"> 显示页脚 </div>-->
        <!--          <div class="drawer-setting-item-action">-->
        <!--            <n-switch v-model:value="settingStore.showFooter" />-->
        <!--          </div>-->
        <!--        </div>-->

        <n-divider title-placement="center">{{ t('layout.setting.animation') }}</n-divider>

        <div class="drawer-setting-item">
          <div class="drawer-setting-item-title"> {{ t('layout.setting.enableAnimation') }} </div>
          <div class="drawer-setting-item-action">
            <n-switch v-model:value="settingStore.isPageAnimate" />
          </div>
        </div>

        <div class="drawer-setting-item">
          <div class="drawer-setting-item-title"> {{ t('layout.setting.animationType') }} </div>
          <div class="drawer-setting-item-select">
            <n-select v-model:value="settingStore.pageAnimateType" :options="animateOptions" />
          </div>
        </div>

        <div class="drawer-setting-item">
          <n-alert type="warning" :showIcon="false">
            <p>{{ t('layout.setting.alertText') }}</p>
          </n-alert>
        </div>
      </div>
    </n-drawer-content>
  </n-drawer>
</template>

<script lang="ts">
  import { defineComponent, reactive, toRefs, unref, computed } from 'vue';
  import { useProjectSettingStore } from '@/store/modules/projectSetting';
  import { useDesignSettingStore } from '@/store/modules/designSetting';
  import { Moon, SunnySharp } from '@vicons/ionicons5';
  import { useI18n } from 'vue-i18n';
  import { animates } from '@/settings/animateSetting';

  export default defineComponent({
    name: 'ProjectSetting',
    components: { Moon, SunnySharp },
    props: {
      title: {
        type: String,
        default: '',
      },
      width: {
        type: Number,
        default: 280,
      },
    },
    setup(props) {
      const settingStore = useProjectSettingStore();
      const designStore = useDesignSettingStore();
      const { t } = useI18n();

      const animateOptions = computed(() =>
        animates.map((item) => ({
          value: item.value,
          label: t(`layout.setting.animate.${item.value}`),
        }))
      );

      const state = reactive({
        width: props.width,
        isDrawer: false,
        placement: 'right' as const,
      });

      const drawerTitle = computed(() => props.title || t('layout.setting.title'));

      const directionsOptions = computed(() => {
        return animateOptions.value.find(
          (item) => item.value == unref(settingStore.pageAnimateType)
        );
      });

      function openDrawer() {
        state.isDrawer = true;
      }

      function closeDrawer() {
        state.isDrawer = false;
      }

      function togNavMode(mode) {
        settingStore.navMode = mode;
        settingStore.menuSetting.mixMenu = false;
      }

      return {
        ...toRefs(state),
        t,
        drawerTitle,
        settingStore,
        designStore,
        togNavMode,
        openDrawer,
        closeDrawer,
        animateOptions,
        directionsOptions,
      };
    },
  });
</script>

<style lang="less" scoped>
  .drawer {
    .n-divider:not(.n-divider--vertical) {
      margin: 10px 0;
    }

    &-setting-item {
      display: flex;
      align-items: center;
      padding: 12px 0;
      flex-wrap: wrap;

      &-style {
        display: inline-block;
        position: relative;
        margin-right: 16px;
        cursor: pointer;
        text-align: center;
      }

      &-title {
        flex: 1 1;
        font-size: 14px;
      }

      &-action {
        flex: 0 0 auto;
      }

      &-select {
        flex: 1;
      }

    }

    .align-items-top {
      align-items: flex-start;
      padding: 2px 0;
    }

    .justify-center {
      justify-content: center;
    }

  }
</style>
