# 后端标准代码模板

本文件属于[全栈架构与编码规约](../coding-standards.md)。

AI 与开发者在生成新代码时，必须对照以下基准模板。下列为结构示意；业务字段、Schema、唯一约束与 DomainError 应按实际规格和模块实现，不将示例视为完整选派业务：

## (1) `src/modules/assignment/assignment.schema.ts`

```
import { Type } from '@sinclair/typebox';

export const AssignRefereeParamsSchema = Type.Object({
  matchId: Type.String({ format: 'uuid' }),
});

export const AssignRefereeBodySchema = Type.Object({
  refereeId: Type.String({ format: 'uuid' }),
  role: Type.Union([Type.Literal('LEAD'), Type.Literal('CREW_CHIEF')]),
});

export const AssignmentResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  matchId: Type.String({ format: 'uuid' }),
  refereeId: Type.String({ format: 'uuid' }),
  status: Type.String(),
  createdAt: Type.String(),
});

```

## (2) `src/modules/assignment/assignment.routes.ts`

```
import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {
  AssignRefereeParamsSchema,
  AssignRefereeBodySchema,
  AssignmentResponseSchema,
} from './assignment.schema';
import type { AssignmentService } from './assignment.service';

// 应用入口注入已装配的 Service，路由不创建持久化依赖。
export const assignmentRoutes = (service: AssignmentService): FastifyPluginAsyncTypebox => async (fastify) => {
  fastify.post(
    '/:matchId/referees',
    {
      schema: {
        params: AssignRefereeParamsSchema,
        body: AssignRefereeBodySchema,
        response: { 201: AssignmentResponseSchema },
      },
    },
    async (request, reply) => {
      const { matchId } = request.params;
      const { refereeId, role } = request.body;
      const result = await service.assignRefereeToMatch(matchId, refereeId, role);
      return reply.code(201).send(result);
    }
  );
};

```

## (3) `src/modules/assignment/assignment.service.ts`

```
import type { AssignmentDTO } from '@refs-tools/contracts';
import type { TransactionRunner } from '../../application/transaction';
import { ConflictError } from '../../application/errors';
import type { AssignmentRepositories } from './assignment.types';

export class AssignmentService {
  constructor(private transaction: TransactionRunner<AssignmentRepositories>) {}

  async assignRefereeToMatch(
    matchId: string,
    refereeId: string,
    role: string
  ): Promise<AssignmentDTO> {
    return this.transaction.run(async ({ assignments }) => {
      // 唯一约束及原子写入防止并发重复；不以先查再写作为一致性保证。
      const assignment = await assignments.createIfAbsent({
        matchId, refereeId, role, status: 'PENDING_CONFIRMATION',
      });
      if (!assignment) throw new ConflictError('REFEREE_ALREADY_ASSIGNED');
      return { ...assignment, createdAt: assignment.createdAt.toISOString() };
    });
  }
}

```

## (4) `src/modules/assignment/assignment.types.ts`

```ts
export type Assignment = {
  id: string;
  matchId: string;
  refereeId: string;
  role: string;
  status: 'PENDING_CONFIRMATION';
  createdAt: Date;
};

export type NewAssignment = Omit<Assignment, 'id' | 'createdAt'>;

export interface AssignmentRepository {
  createIfAbsent(data: NewAssignment): Promise<Assignment | null>;
}

export type AssignmentRepositories = { assignments: AssignmentRepository };
```

## (5) `src/modules/assignment/assignment.repository.ts`

```ts
import type { PoolClient } from 'pg';
import type { Assignment, AssignmentRepository, NewAssignment } from './assignment.types';

type AssignmentRow = {
  id: string;
  match_id: string;
  referee_id: string;
  role: string;
  status: Assignment['status'];
  created_at: Date;
};

export class PgAssignmentRepository implements AssignmentRepository {
  constructor(private connection: Pick<PoolClient, 'query'>) {}

  async createIfAbsent(data: NewAssignment): Promise<Assignment | null> {
    const result = await this.connection.query<AssignmentRow>(`
      INSERT INTO match_assignments (match_id, referee_id, role, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (match_id, referee_id) DO NOTHING
      RETURNING id, match_id, referee_id, role, status, created_at
    `, [data.matchId, data.refereeId, data.role, data.status]);
    const row = result.rows[0];
    return row ? {
      id: row.id, matchId: row.match_id, refereeId: row.referee_id,
      role: row.role, status: row.status, createdAt: row.created_at,
    } : null;
  }
}
```

应用装配入口持有 `pool` 并负责关闭；将 `createTransactionRunner(pool, client => ({ assignments: new PgAssignmentRepository(client) }))` 注入 `AssignmentService`，再将 Service 注入路由。基础设施事务实现见 `apps/api/src/infrastructure/database/transaction.ts`。
