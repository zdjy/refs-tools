import { defineStore } from 'pinia';
import type { AuthUser } from '@refs-tools/contracts/auth';
import { store } from '@/store';
import { getUserInfo, login, logout } from '@/api/system/user';

export type UserInfoType = { username: string; email: string; id?: string; avatarMediaId?: string | null };
export type IUserState = { username: string; avatar: string; permissions: { label: string; value: string }[]; info: UserInfoType };

/** 认证信息只在内存保存；Cookie 的生命周期由 API 管理。 */
export const useUserStore = defineStore({
  id: 'app-user',
  state: () => ({
    username: '', avatar: '', permissions: [] as { label: string; value: string }[],
    info: { username: '', email: '' } as UserInfoType,
  }),
  getters: {
    getToken: () => '',
    getAvatar: (state) => state.avatar,
    getNickname: (state) => state.username,
    getPermissions: (state) => state.permissions,
    getUserInfo: (state) => state.info,
  },
  actions: {
    applyUser(user: AuthUser) {
      this.username = user.displayName;
      this.info = { id: user.id, username: user.email, email: user.email, avatarMediaId: user.avatarMediaId };
      this.permissions = [];
      return { ...this.info, permissions: this.permissions };
    },
    async login(params: { username: string; password: string }) {
      const session = await login(params);
      this.applyUser(session.user);
      return { code: 200, message: '登录成功' };
    },
    async getInfo() {
      const session = await getUserInfo();
      return this.applyUser(session.user);
    },
    async logout() {
      await logout();
      this.$reset();
    },
  },
});

/** 为框架外部导航适配提供显式 Pinia 实例。 */
export function useUser() { return useUserStore(store); }
