import {
  CreatePlatformInviteSchema, PlatformInviteCreatedResponseSchema, PlatformInviteListResponseSchema, PlatformInviteParamsSchema,
  PlatformInviteQuerySchema, PlatformInviteResponseSchema, RevokePlatformInviteSchema,
} from '@refs-tools/contracts/platform-invites'

export const platformInviteListSchema = { querystring: PlatformInviteQuerySchema, response: { 200: PlatformInviteListResponseSchema } }
export const platformInviteCreateSchema = { body: CreatePlatformInviteSchema, response: { 201: PlatformInviteCreatedResponseSchema } }
export const platformInviteRevokeSchema = {
  params: PlatformInviteParamsSchema, body: RevokePlatformInviteSchema, response: { 200: PlatformInviteResponseSchema },
}
