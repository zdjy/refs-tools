import { randomUUID } from 'node:crypto'
import { vi } from 'vitest'
import type { JoinCode } from '@refs-tools/contracts/organization-access'
import type { AccessRepositories } from '../../src/modules/organizations/organization-access.types.js'
import { OrganizationSelfService } from '../../src/modules/organizations/organization-self.service.js'
import { OrganizationJoinCodesService } from '../../src/modules/organizations/organization-join-codes.service.js'
import { OrganizationRolesService } from '../../src/modules/organizations/organization-roles.service.js'
import { OrganizationCandidatesService } from '../../src/modules/organizations/organization-candidates.service.js'
import { permissions } from '../helpers/permissions.js'
import { memberFixture } from './members-fixture.js'

/** 在成员夹具上补齐成员码、角色、候选人与自助端口；授权仍使用真实策略。 */
export function accessFixture() {
  const base = memberFixture()
  const code: JoinCode = { id: randomUUID(), hint: 'abcd', status: 'active', maxUses: 2, uses: 0, version: 1,
    createdAt: base.now.toISOString(), expiresAt: new Date(base.now.getTime() + 86_400_000).toISOString() }
  const bindings: Array<{ id: string; userId: string; displayName: string; role: 'owner' | 'organizer' | 'certifier'; grantedAt: string }> = []
  const r: AccessRepositories = { ...base.r,
    self: { mine: vi.fn(async () => []), directory: vi.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 20 })),
      lockApplicant: vi.fn(async () => {}), countPending: vi.fn(async () => 0), apply: vi.fn(async () => {}),
      applicantProfile: vi.fn(async () => ({ legalName: '张三', phone: '+8613800138000' })) },
    joinCodes: { list: vi.fn(async () => [code]), countActive: vi.fn(async () => 0), create: vi.fn(async () => {}),
      find: vi.fn(async () => ({ ...code })), organizationOf: vi.fn(async () => base.id),
      consume: vi.fn(async () => ({ ...code, uses: 1 })), revoke: vi.fn(async () => true) },
    roles: { list: vi.fn(async () => [...bindings]) },
    candidates: { search: vi.fn(async () => []) },
  }
  base.r.authorization.insertBinding = vi.fn(async binding => {
    bindings.push({ id: binding.id, userId: binding.subjectUserId, displayName: '成员', role: binding.role as 'organizer' | 'certifier', grantedAt: binding.startsAt })
    return true
  })
  const d = { transaction: { run: async <T>(work: (repositories: AccessRepositories) => Promise<T>) => work(r) }, permissions, now: () => base.now }
  return { ...base, r, code, bindings, d, self: new OrganizationSelfService(d), joinCodes: new OrganizationJoinCodesService(d),
    roles: new OrganizationRolesService(d), candidates: new OrganizationCandidatesService(d) }
}
