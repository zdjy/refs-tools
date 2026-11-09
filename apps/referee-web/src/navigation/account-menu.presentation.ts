import { modules } from './modules'

/** 账号菜单项只做展示投影：路径来自导航定义的同一来源，退出登录属于命令而非链接。 */
export type AccountMenuId = 'profile' | 'certifications' | 'organizations' | 'account' | 'feedback'

export interface AccountMenuLink {
  id: AccountMenuId
  label: string
  path: string
}

export const accountMenuLinks: readonly AccountMenuLink[] = [
  { id: 'profile', label: modules.profile.title, path: modules.profile.path },
  { id: 'certifications', label: modules.certifications.title, path: modules.certifications.path },
  { id: 'organizations', label: modules.organizations.title, path: modules.organizations.path },
  { id: 'account', label: '账号设置', path: '/profile-setting' },
  { id: 'feedback', label: modules.feedback.title, path: modules.feedback.path },
]
