import { defineStore } from 'pinia';
import projectSetting from '@/settings/projectSetting';
import type { ICrumbsSetting, IHeaderSetting, IMenuSetting } from '/#/config';

const { isMobile, headerSetting, menuSetting, crumbsSetting, permissionMode } = projectSetting;

interface ProjectSettingState {
  isMobile: boolean;
  headerSetting: IHeaderSetting;
  menuSetting: IMenuSetting;
  crumbsSetting: ICrumbsSetting;
  permissionMode: string;
}

/**
 * 管理端固定为左侧菜单布局，因此不再保存导航模式、多标签栏、页脚与路由动画配置。
 * 主题、密度与侧栏默认收起由 `designSetting` store 持有并持久化。
 */
export const useProjectSettingStore = defineStore({
  id: 'app-project-setting',
  state: (): ProjectSettingState => ({
    isMobile,
    headerSetting,
    menuSetting,
    crumbsSetting,
    permissionMode,
  }),
  getters: {
    getIsMobile(): boolean {
      return this.isMobile;
    },
    getHeaderSetting(): IHeaderSetting {
      return this.headerSetting;
    },
    getMenuSetting(): IMenuSetting {
      return this.menuSetting;
    },
    getCrumbsSetting(): ICrumbsSetting {
      return this.crumbsSetting;
    },
    getPermissionMode(): string {
      return this.permissionMode;
    },
  },
  actions: {
    setIsMobile(value: boolean): void {
      this.isMobile = value;
    },
    setHeaderSetting(value: Partial<IHeaderSetting>): void {
      this.headerSetting = { ...this.headerSetting, ...value };
    },
    setMenuSetting(value: Partial<IMenuSetting>): void {
      this.menuSetting = { ...this.menuSetting, ...value };
    },
    setCrumbsSetting(value: Partial<ICrumbsSetting>): void {
      this.crumbsSetting = { ...this.crumbsSetting, ...value };
    },
  },
});
