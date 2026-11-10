import type { AdminDensity } from '@/settings/uiScale';

const setting = {
  // 导航固定为左侧菜单模式，不提供顶部或混合菜单。
  isMobile: false,
  headerSetting: {
    fixed: true,
  },
  menuSetting: {
    minMenuWidth: 56,
    menuWidth: 232,
    fixed: true,
    // 触发移动端抽屉式侧栏的宽度
    mobileWidth: 768,
  },
  // 面包屑只在出现三级路由时启用；当前导航只有一层，默认关闭。
  crumbsSetting: {
    show: false,
    showIcon: false,
  },
  // 权限模式 FIXED 前端固定路由 / BACK 动态获取
  permissionMode: 'FIXED',
  // 默认主题与密度，可在界面设置抽屉中修改并持久化。
  darkTheme: false,
  density: 'compact' as AdminDensity,
  siderCollapsedByDefault: false,
};

export default setting;
