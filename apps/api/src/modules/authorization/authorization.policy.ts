import type { Role, ScopeType } from '@refs-tools/contracts/authorization'
import type { Permission } from '@refs-tools/domain'

type PermissionRule = { roles: readonly (Role | 'self')[]; targets: readonly ScopeType[] }

/** 固定角色授权矩阵；self 仅由当前用户的资源所有权派生，不属于可授予角色。 */
export const permissionRules = {
  'self.read': { roles: ['self'], targets: ['self'] },
  'self.write': { roles: ['self'], targets: ['self'] },
  'platform.manage': { roles: ['platform_admin'], targets: ['platform'] },
  'organization.manage': { roles: ['owner'], targets: ['organization'] },
  'role.manage': { roles: ['owner', 'platform_admin'], targets: ['platform', 'organization'] },
  'role.delegate': { roles: ['owner', 'organizer'], targets: ['event', 'match'] },
  'event.manage': { roles: ['owner', 'organizer'], targets: ['organization', 'event'] },
  'match.manage': { roles: ['owner', 'organizer'], targets: ['match'] },
  'match.operate': { roles: ['owner', 'organizer', 'head_referee'], targets: ['match'] },
  'organization.certification.review': { roles: ['certifier'], targets: ['organization'] },
  'platform.certification.review': { roles: ['platform_admin'], targets: ['platform'] },
  'content.edit': { roles: ['content_editor'], targets: ['platform'] },
  'content.unpublish': { roles: ['content_editor', 'platform_admin'], targets: ['platform'] },
  'grading.review': { roles: ['grader'], targets: ['platform'] },
  'results.override': { roles: ['platform_admin'], targets: ['platform'] },
  'moderation.manage': { roles: ['moderator'], targets: ['platform'] },
  'audit.read': { roles: ['owner', 'platform_admin'], targets: ['platform', 'organization'] },
} as const satisfies Record<Permission, PermissionRule>
