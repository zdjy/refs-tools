import { Type } from '@sinclair/typebox'
import {
  CandidateListResponseSchema, CandidateQuerySchema, CreateJoinCodeSchema, GrantRoleSchema, JoinCodeCreatedResponseSchema,
  JoinCodeListResponseSchema, JoinCodeParamsSchema, JoinCodeResponseSchema, RedeemJoinCodeSchema, RedeemResponseSchema,
  RevokeJoinCodeSchema, RoleListResponseSchema, RoleParamsSchema, RoleResponseSchema, RoleRevokedResponseSchema,
} from '@refs-tools/contracts/organization-access'
import { MemberOrganizationParamsSchema } from '@refs-tools/contracts/organization-members'
import {
  DirectoryQuerySchema, DirectoryResponseSchema, MyOrganizationListResponseSchema, MyOrganizationResponseSchema,
  OrganizationApplicationSchema,
} from '@refs-tools/contracts/organization-self'

const organization = { params: MemberOrganizationParamsSchema }
export const mineSchema = { response: { 200: MyOrganizationListResponseSchema } }
export const directorySchema = { querystring: DirectoryQuerySchema, response: { 200: DirectoryResponseSchema } }
export const applySchema = { body: OrganizationApplicationSchema, response: { 201: MyOrganizationResponseSchema } }
export const joinCodeListSchema = { ...organization, response: { 200: JoinCodeListResponseSchema } }
export const joinCodeCreateSchema = { ...organization, body: CreateJoinCodeSchema, response: { 201: JoinCodeCreatedResponseSchema } }
export const joinCodeRevokeSchema = { params: JoinCodeParamsSchema, body: RevokeJoinCodeSchema, response: { 200: JoinCodeResponseSchema } }
export const redeemSchema = { body: RedeemJoinCodeSchema, response: { 200: RedeemResponseSchema } }
export const roleListSchema = { ...organization, response: { 200: RoleListResponseSchema } }
export const roleGrantSchema = { ...organization, body: GrantRoleSchema, response: { 201: RoleResponseSchema } }
export const roleRevokeSchema = { params: RoleParamsSchema, body: Type.Object({}, { additionalProperties: false }), response: { 200: RoleRevokedResponseSchema } }
export const candidateSchema = { ...organization, querystring: CandidateQuerySchema, response: { 200: CandidateListResponseSchema } }
