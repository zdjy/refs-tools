import { newEnforcer, newModelFromString, StringAdapter } from 'casbin'
import { isAuthorizationContextAllowed, isRoleBindingActive, scopeCoversResource } from '@refs-tools/domain'
import { permissionRules } from '../../modules/authorization/authorization.policy.js'
import type { PermissionEvaluator } from '../../modules/authorization/authorization.types.js'

const model = `
[request_definition]
r = role, scope, resource, permission
[policy_definition]
p = role, permission, target
[policy_effect]
e = some(where (p.eft == allow))
[matchers]
m = r.role == p.role && r.permission == p.permission && r.resource.type == p.target && scopeCovers(r.scope, r.resource)
`

/** 启动时构建只读策略引擎；不保存用户绑定或结果，事务内仅同步计算，参见 ADR 0015。 */
export async function createCasbinPermissionEvaluator(): Promise<PermissionEvaluator> {
  const policy = Object.entries(permissionRules).flatMap(([permission, rule]) => rule.roles.flatMap((role) =>
    rule.targets.map((target) => `p, ${role}, ${permission}, ${target}`))).join('\n')
  const enforcer = await newEnforcer(newModelFromString(model), new StringAdapter(policy))
  enforcer.enableAutoSave(false)
  await enforcer.addFunction('scopeCovers', scopeCoversResource)
  return {
    isPermitted(permission, context) {
      if (!isAuthorizationContextAllowed(permission, context)) return false
      if (context.resource.type === 'self') {
        return enforcer.enforceSync('self', { type: 'self', id: context.subjectUserId }, context.resource, permission)
      }
      // 一次只匹配同一条有效绑定的角色与范围，避免多绑定拼接或共享实例串权。
      return context.bindings.some((binding) => isRoleBindingActive(binding, context)
        && enforcer.enforceSync(binding.role, { type: binding.scopeType, id: binding.scopeId }, context.resource, permission))
    },
  }
}
