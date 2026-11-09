import type { PoolClient } from 'pg'
import type { LearningCategory, LearningCategoryInput, LearningCategoryUpdate } from '@refs-tools/contracts/learning'
import type { PageQuery } from '@refs-tools/contracts/pagination'

type Row = { id: string; parent_id: string | null; name: string; slug: string; depth: number; status: LearningCategory['status']; revision: number }
const columns = 'id,parent_id,name,slug,depth,status,revision'
function map(row: Row): LearningCategory { return { id: row.id, parentId: row.parent_id, name: row.name, slug: row.slug,
  depth: row.depth, status: row.status, revision: row.revision } }

/** 分类表由 learning 模块拥有；树形变更由同一事务锁串行化，子树按父先子后更新。 */
export class PgLearningCategoriesRepository {
  constructor(protected readonly connection: Pick<PoolClient, 'query'>) {}

  async lockCategories() { await this.connection.query('SELECT pg_advisory_xact_lock(912012)') }

  async category(id: string) {
    const result = await this.connection.query<Row>(`SELECT ${columns} FROM learning_categories WHERE id=$1`, [id])
    return result.rows[0] ? map(result.rows[0]) : null
  }

  async categoryCreation(actor: string, key: string) {
    const result = await this.connection.query<Row & { request_fingerprint: string }>(`SELECT ${columns},request_fingerprint
      FROM learning_categories WHERE created_by=$1 AND idempotency_key=$2`, [actor, key])
    return result.rows[0] ? { category: map(result.rows[0]), fingerprint: result.rows[0].request_fingerprint } : null
  }

  async categories(query: PageQuery, management: boolean) {
    const page = Number(query.page ?? 1), pageSize = Number(query.pageSize ?? 20)
    const count = await this.connection.query<{ total: string }>("SELECT count(*) AS total FROM learning_categories WHERE $1 OR status='active'", [management])
    const result = await this.connection.query<Row>(`SELECT ${columns} FROM learning_categories WHERE $1 OR status='active'
      ORDER BY depth,slug,id LIMIT $2 OFFSET $3`, [management, pageSize, (page - 1) * pageSize])
    return { items: result.rows.map(map), total: Number(count.rows[0]!.total), page, pageSize }
  }

  async categoryPlacement(parentId: string | null, movingId?: string) {
    const parent = parentId ? await this.category(parentId) : null
    if (parentId && !parent) return null
    const result = await this.connection.query<{ height: number; cycle: boolean }>(`WITH RECURSIVE subtree AS (
      SELECT id,depth FROM learning_categories WHERE id=$1
      UNION ALL SELECT c.id,c.depth FROM learning_categories c JOIN subtree s ON c.parent_id=s.id
    ) SELECT COALESCE(max(depth)-min(depth),0)::int AS height,COALESCE(bool_or(id=$2),false) AS cycle FROM subtree`, [movingId ?? null, parentId])
    return { depth: (parent?.depth ?? 0) + 1, ...result.rows[0]! }
  }

  async saveCategory(id: string, input: LearningCategoryInput | LearningCategoryUpdate, depth: number, actor: string, key?: string, fingerprint?: string) {
    try {
      if (!('expectedRevision' in input)) {
        await this.connection.query(`INSERT INTO learning_categories(id,parent_id,name,slug,depth,status,created_by,idempotency_key,request_fingerprint)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [id, input.parentId, input.name, input.slug, depth, input.status, actor, key, fingerprint])
        return true
      }
      const descendants = await this.connection.query<{ id: string; depth: number }>(`WITH RECURSIVE subtree AS (
        SELECT id,depth FROM learning_categories WHERE parent_id=$1
        UNION ALL SELECT c.id,c.depth FROM learning_categories c JOIN subtree s ON c.parent_id=s.id
      ) SELECT id,depth FROM subtree ORDER BY depth,id`, [id])
      const result = await this.connection.query<{ depth: number }>(`UPDATE learning_categories SET parent_id=$2,name=$3,slug=$4,depth=$5,status=$6,revision=revision+1
        WHERE id=$1 AND revision=$7 RETURNING depth`, [id, input.parentId, input.name, input.slug, depth, input.status, input.expectedRevision])
      if (!result.rowCount) return false
      for (const child of descendants.rows) {
        const parent = await this.connection.query<{ depth: number }>('SELECT p.depth+1 AS depth FROM learning_categories c JOIN learning_categories p ON c.parent_id=p.id WHERE c.id=$1', [child.id])
        await this.connection.query('UPDATE learning_categories SET depth=$2,revision=revision+1 WHERE id=$1', [child.id, parent.rows[0]!.depth])
      }
      return true
    } catch (error) {
      if ((error as { code?: string; constraint?: string }).code === '23505' && (error as { constraint?: string }).constraint === 'learning_categories_slug_key') return false
      throw error
    }
  }

  async activeCategories(ids: string[]) {
    const result = await this.connection.query<{ total: string }>("SELECT count(*) AS total FROM learning_categories WHERE id=ANY($1::uuid[]) AND status='active'", [ids])
    return Number(result.rows[0]!.total) === ids.length
  }
}
