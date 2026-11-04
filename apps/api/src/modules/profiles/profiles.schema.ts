import { ProfileResponseSchema, UpdateProfileBodySchema } from '@refs-tools/contracts/profile'

export const getProfileSchema = { response: { 200: ProfileResponseSchema } }
export const updateProfileSchema = { body: UpdateProfileBodySchema, response: { 200: ProfileResponseSchema } }
