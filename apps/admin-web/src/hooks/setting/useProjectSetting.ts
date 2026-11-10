import { computed } from 'vue';
import { useProjectSettingStore } from '@/store/modules/projectSetting';

/**
 * 布局相关配置。管理端固定左侧菜单，因此不导出导航模式、多标签栏与页脚配置。
 */
export function useProjectSetting() {
  const projectStore = useProjectSettingStore();
  const isMobile = computed(() => projectStore.isMobile);
  const headerSetting = computed(() => projectStore.headerSetting);
  const menuSetting = computed(() => projectStore.menuSetting);
  const crumbsSetting = computed(() => projectStore.crumbsSetting);
  const permissionMode = computed(() => projectStore.permissionMode);

  return {
    isMobile,
    headerSetting,
    menuSetting,
    crumbsSetting,
    permissionMode,
  };
}
