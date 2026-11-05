import { randomUUID } from 'node:crypto'
import { vi } from 'vitest'
import type { Membership, OrganizationInvitation } from '@refs-tools/contracts/organization-members'
import type { OrganizationDetail } from '@refs-tools/contracts/organizations'
import type { MemberRepositories } from '../../src/modules/organizations/organization-members.types.js'
import { OrganizationMembersService } from '../../src/modules/organizations/organization-members.service.js'
import { OrganizationInvitationsService } from '../../src/modules/organizations/organization-invitations.service.js'
import { permissions } from '../helpers/permissions.js'

/** 用真实授权策略和内存端口验证用例，数据库原子性另做集成验证。 */
export function memberFixture() {
  const actor = randomUUID(), user = randomUUID(), id = randomUUID(), now = new Date('2026-11-02T12:00:00Z')
  const organization: OrganizationDetail = { id, name: '协会', ownerUserId: actor, status: 'active', region: '', purpose: '', version: 1,
    createdAt: now.toISOString(), ownerLegalName: '', contact: '', reviewedBy: null, reviewedAt: null, governanceReason: null }
  const member: Membership = { id: randomUUID(), organizationId: id, userId: user, displayName: '成员', status: 'pending', version: 1, createdAt: now.toISOString() }
  const invitation: OrganizationInvitation = { id: randomUUID(), organizationId: id, organizationName: '协会', userId: user, displayName: '成员',
    status: 'pending', version: 1, createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 86400000).toISOString() }
  const r: MemberRepositories = {
    organizations: { find: vi.fn(async () => organization), list: vi.fn(), create: vi.fn(), changeStatus: vi.fn(), activateOwnerMembership: vi.fn() },
    identities: { requireActiveActor: vi.fn(async () => true) },
    members: { members: vi.fn(async () => ({ items: [member], total: 1, page: 1, pageSize: 20 })),
      invitations: vi.fn(async () => ({ items: [invitation], total: 1, page: 1, pageSize: 20 })),
      membership: vi.fn(async () => ({ ...member })), current: vi.fn(async () => null),
      join: vi.fn(async (_id, _org, _user, status) => { member.status = status; return { ...member } }),
      changeMember: vi.fn(async (_id, _version, status) => { member.status = status; member.version++; return true }),
      invitation: vi.fn(async () => ({ ...invitation })), createInvitation: vi.fn(async () => true),
      changeInvitation: vi.fn(async (_id, _version, status) => { invitation.status = status; invitation.version++; return true }) },
    authorization: { resolveScope: vi.fn(async ref => ({ ...ref, organizationId: ref.type === 'platform' ? null : id,
      ownerUserId: actor, eventId: null, matchId: null, organizationStatus: 'active', state: 'active' })),
      findBindings: vi.fn(async subject => [{ id: randomUUID(), subjectUserId: subject, role: subject === actor ? 'owner' as const : 'platform_admin' as const,
        scopeType: subject === actor ? 'organization' as const : 'platform' as const, scopeId: subject === actor ? id : null,
        grantedBy: actor, startsAt: now.toISOString(), expiresAt: null, revokedAt: null }]),
      isActiveMember: vi.fn(async () => true), insertBinding: vi.fn(), findBinding: vi.fn(), revokeBinding: vi.fn(async () => true) },
    audit: { append: vi.fn(async () => {}), list: vi.fn() },
  }
  const d = { transaction: { run: async <T>(work: (r: MemberRepositories) => Promise<T>) => work(r) }, permissions, now: () => now }
  return { actor, user, id, now, r, organization, member, invitation, members: new OrganizationMembersService(d), invitations: new OrganizationInvitationsService(d) }
}
