import type { LearningAsset, LearningCategory, LearningCategoryInput, LearningCategoryUpdate, LearningContent,
  LearningQuery, LearningSummary, LearningVersion } from '@refs-tools/contracts/learning'
import type { PageQuery, Paged } from '@refs-tools/contracts/pagination'
import type { TransactionRunner } from '../../application/transaction.js'
import type { MediaRepository, ObjectStorage } from '../media/media.types.js'
import type { AuthorizationRepository, PermissionEvaluator } from '../authorization/authorization.types.js'
import type { AuditRepository } from '../audit/audit.types.js'

export interface LearningRepository {
  lockCategories(): Promise<void>
  category(id: string): Promise<LearningCategory | null>
  categoryCreation(actor: string, key: string): Promise<{ category: LearningCategory; fingerprint: string } | null>
  categories(query: PageQuery, management: boolean): Promise<Paged<LearningCategory>>
  categoryPlacement(parentId: string | null, movingId?: string): Promise<{ depth: number; cycle: boolean; height: number } | null>
  saveCategory(id: string, input: LearningCategoryInput | LearningCategoryUpdate, depth: number, actor: string, key?: string, fingerprint?: string): Promise<boolean>
  activeCategories(ids: string[]): Promise<boolean>
  create(asset: LearningAsset, actor: string, key: string, fingerprint: string): Promise<boolean>
  findCreation(actor: string, key: string): Promise<{ asset: LearningAsset; fingerprint: string } | null>
  asset(id: string): Promise<LearningAsset | null>
  version(id: string, version: number): Promise<LearningVersion | null>
  versions(id: string, query: PageQuery): Promise<Paged<LearningVersion>>
  list(query: LearningQuery, management: boolean): Promise<Paged<LearningSummary>>
  appendVersion(id: string, version: number, input: LearningContent, actor: string, at: string): Promise<void>
  save(asset: LearningAsset, expectedRevision: number): Promise<boolean>
  recordPublication(asset: LearningAsset, actor: string, at: string): Promise<void>
}
export type LearningRepositories = { learning: LearningRepository; media: MediaRepository; authorization: AuthorizationRepository; audit: AuditRepository }
export type LearningDependencies = { transaction: TransactionRunner<LearningRepositories>; permissions: PermissionEvaluator;
  now: () => Date; storage?: ObjectStorage }
