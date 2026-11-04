import { createDatabasePool, databaseConfigFromEnvironment } from './infrastructure/database/pool.js'
import { createCasbinPermissionEvaluator } from './infrastructure/authorization/casbin.js'
import { buildMediaService } from './media-bootstrap.js'

const pool = createDatabasePool({ ...databaseConfigFromEnvironment(process.env), max: 1 })
try {
  const permissions = await createCasbinPermissionEvaluator()
  const media = buildMediaService(process.env, pool, permissions)
  if (!media) throw new Error('MEDIA_ENABLED=true is required')
  const result = await media.service.cleanup(100)
  console.info(`媒体维护完成：清理 ${result.cleaned} 个对象`)
} catch {
  console.error('媒体维护失败，请检查配置和存储/数据库可用性；不输出底层凭据或 URL')
  process.exitCode = 1
} finally { await pool.end() }
