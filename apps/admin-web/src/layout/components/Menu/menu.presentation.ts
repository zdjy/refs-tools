import { h } from 'vue'
import { RouterLink } from 'vue-router'
import type { MenuOption } from 'naive-ui'
import { adminModules } from '../../../router/modules'

/** 将静态导航投影为模板菜单；不读取角色、能力或服务端菜单。 */
export function createMenuOptions(onNavigate: (path: string) => void): MenuOption[] {
  const link = (path: string, title: string): MenuOption => ({
    key: path,
    label: () => h(RouterLink, {
      to: path,
      class: 'flex min-h-[44px] items-center text-sm font-medium no-underline',
      onClick: () => onNavigate(path),
    }, () => title),
    icon: () => h('span', { 'aria-hidden': 'true', class: 'text-sm font-bold' }, title.slice(0, 1)),
  })
  return [
    { type: 'group', key: 'workspace', label: '工作空间', children: [link('/', '运营工作台')] },
    ...['运营管理', '学习与考试', '安全与治理'].map(group => ({
      type: 'group' as const, key: group, label: group,
      children: [
        ...adminModules.filter(item => item.group === group).map(item => link(item.path, `${item.title}${'beta' in item ? ' · Beta' : ''}`)),
        ...(group === '安全与治理' ? [link('/audit', '操作审计')] : []),
      ],
    })),
  ]
}
