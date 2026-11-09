import { randomUUID } from 'node:crypto'
import { vi } from 'vitest'
import type { Certification, CertificationAppeal, CreateCertification } from '@refs-tools/contracts/certifications'
import type { CertificationDependencies, CertificationRepositories } from '../../src/modules/certifications/certifications.types.js'
import { CertificationsService } from '../../src/modules/certifications/certifications.service.js'
import { CertificationReviewService } from '../../src/modules/certifications/certification-review.service.js'
import { CertificationAppealsService } from '../../src/modules/certifications/certification-appeals.service.js'
import { CertificationEvidenceService } from '../../src/modules/certifications/certification-evidence.service.js'
import { mediaHarness } from '../helpers/media.js'
import { permissions } from '../helpers/permissions.js'
import type { AuthorizationRepository } from '../../src/modules/authorization/authorization.types.js'

/** 内存端口替身执行真实 Service 和固定授权策略；SQL 约束另由独立数据库用例验证。 */
export function certificationFixture() {
  const base = mediaHarness(), subject = base.actor, reviewer = randomUUID(), owner = randomUUID(), org = randomUUID()
  const now = new Date('2026-11-04T00:00:00Z'), scope = { type: 'organization' as const, organizationId: org }
  const input: CreateCertification = { scope, level: 'level_2', certificateNumber: '私有编号', issuer: '省协会', obtainedAt: '2025-01-01',
    evidenceMediaIds: [randomUUID()], historyMediaIds: [randomUUID()], statement: '执裁经历说明' }
  for (const id of [...input.evidenceMediaIds, ...input.historyMediaIds]) base.records.set(id, { id, ownerUserId: subject,
    purpose: 'certification_evidence', target: { type: 'self', id: subject }, status: 'available', objectKey: `private/${id}`,
    contentType: 'image/jpeg', expectedSizeBytes: 10, verifiedSizeBytes: 10, expiresAt: now.toISOString(), createdAt: now.toISOString(), etag: 'e', cleanedAt: null })
  let record: Certification = { ...input, id: randomUUID(), subjectUserId: subject, status: 'under_review', effectiveStatus: 'under_review',
    version: 2, reviewedBy: null, reviewedAt: null, reviewNote: null, createdAt: now.toISOString(), updatedAt: now.toISOString() }
  const appeals = new Map<string, CertificationAppeal>()
  const requests = new Map<string, { id: string; fingerprint: string }>()
  const histories: Certification[] = []
  let exists = true, member = true, active = true, revoked = false, prerequisite = true
  const page = <T>(items: T[]) => ({ items, total: items.length, page: 1, pageSize: 20 })
  const r: CertificationRepositories = { ...base.repositories, certifications: {
    locate: vi.fn(async id => exists && id === record.id ? { subjectUserId: subject, scope: record.scope } : null),
    lockOrganization: vi.fn(async () => ({ active })), find: vi.fn(async () => ({ ...record })),
    current: vi.fn(async () => exists ? { ...record } : null), request: vi.fn(async (_subject, key) => requests.get(key) ?? null),
    insert: vi.fn(async (value, key, fingerprint) => { record = value; exists = true; requests.set(key, { id: value.id, fingerprint }) }),
    save: vi.fn(async value => { record = value; return true }), list: vi.fn(async () => page(exists ? [record] : [])),
    reviewList: vi.fn(async () => page(exists ? [{ ...record, applicant: { nickname: '裁判昵称', legalName: '裁判实名' } }] : [])),
    prerequisiteOrganizations: vi.fn(async () => [org]), hasPrerequisite: vi.fn(async () => prerequisite),
    appendHistory: vi.fn(async value => { histories.push(structuredClone(value)) }), history: vi.fn(async () => page([])),
    hasPendingAppeal: vi.fn(async () => [...appeals.values()].some(a => a.status === 'pending')),
    insertAppeal: vi.fn(async a => { if ([...appeals.values()].some(v => v.status === 'pending')) return false; appeals.set(a.id, a); return true }),
    appeal: vi.fn(async (_id, appealId) => appeals.get(appealId) ?? null), saveAppeal: vi.fn(async a => { appeals.set(a.id, a); return true }),
    appeals: vi.fn(async () => page([...appeals.values()])), hasEvidence: vi.fn(async () => true),
    mediaReferences: vi.fn(async () => exists ? [{ id: record.id, scope: record.scope, subjectUserId: subject }] : []),
  } }
  r.authorization.resolveScope = vi.fn<AuthorizationRepository['resolveScope']>(async ref => ({ type: ref.type, id: ref.id, organizationId: ref.type === 'organization' ? org : null,
    ownerUserId: owner, eventId: null, matchId: null, organizationStatus: active ? 'active' : 'frozen', state: active ? 'active' : 'frozen' }))
  r.authorization.isActiveMember = vi.fn(async actor => actor === subject ? member : true)
  r.authorization.findBindings = vi.fn<AuthorizationRepository['findBindings']>(async actor => revoked ? [] : [{ id: randomUUID(), subjectUserId: actor, role: actor === owner ? 'owner' : 'certifier',
    scopeType: 'organization', scopeId: org, grantedBy: owner, startsAt: '2026-01-01T00:00:00Z', expiresAt: null, revokedAt: null }])
  const d: CertificationDependencies = { transaction: { run: work => work(r) }, permissions, now: () => now, storage: base.dependencies.storage }
  return { ...base, r, d, subject, reviewer, owner, org, scope, input, histories, appeals,
    service: new CertificationsService(d), review: new CertificationReviewService(d), appealService: new CertificationAppealsService(d),
    evidence: new CertificationEvidenceService(d), record: () => record,
    setRecord(value: Partial<Certification>) { record = { ...record, ...value } }, setExists(value: boolean) { exists = value },
    setMember(value: boolean) { member = value }, setOrganizationActive(value: boolean) { active = value },
    setRevoked(value: boolean) { revoked = value }, setPrerequisite(value: boolean) { prerequisite = value } }
}
