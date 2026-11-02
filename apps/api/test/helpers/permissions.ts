import { createCasbinPermissionEvaluator } from '../../src/infrastructure/authorization/casbin.js'

export const permissions = await createCasbinPermissionEvaluator()
