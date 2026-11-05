import { RouteRecordRaw } from 'vue-router';
import { Layout } from '@/router/constant';
import { OptionsSharp } from '@vicons/ionicons5';
import { renderIcon } from '@/utils/index';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/system',
    name: 'System',
    redirect: '/system/user',
    component: Layout,
    meta: {
      title: 'route.system',
      icon: renderIcon(OptionsSharp),
      sort: 1,
    },
    children: [
      {
        path: 'user',
        name: 'system_user',
        meta: { title: 'route.system_user', affix: true },
        component: () => import('@/views/system/user/user.vue'),
      },
      {
        path: 'organization',
        name: 'system_organization',
        meta: { title: 'route.system_organization' },
        component: () => import('@/views/system/organization/organization.vue'),
      },
      {
        path: 'file',
        name: 'system_file',
        meta: { title: 'route.system_file' },
        component: () => import('@/views/system/file/file.vue'),
      },
      {
        path: 'menu',
        name: 'system_menu',
        meta: {
          title: 'route.system_menu',
        },
        component: () => import('@/views/system/menu/menu.vue'),
      },
      {
        path: 'role',
        name: 'system_role',
        meta: {
          title: 'route.system_role',
        },
        component: () => import('@/views/system/role/role.vue'),
      },
    ],
  },
];

export default routes;
