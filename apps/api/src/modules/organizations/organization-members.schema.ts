import { Type } from '@sinclair/typebox'
import { CreateInvitationSchema, InvitationListResponseSchema, InvitationResponseSchema, MemberChangeSchema,
  MemberOrganizationParamsSchema, MemberPageQuerySchema, MemberRecordParamsSchema,
  MembershipDecisionSchema, MembershipListResponseSchema, MembershipResponseSchema } from '@refs-tools/contracts/organization-members'

export const memberListSchema = { params: MemberOrganizationParamsSchema, querystring: MemberPageQuerySchema, response: { 200: MembershipListResponseSchema } }
export const invitationListSchema = { params: MemberOrganizationParamsSchema, querystring: MemberPageQuerySchema, response: { 200: InvitationListResponseSchema } }
export const invitationInboxSchema = { querystring: MemberPageQuerySchema, response: { 200: InvitationListResponseSchema } }
export const invitationCreateSchema = { params: MemberOrganizationParamsSchema, body: CreateInvitationSchema, response: { 201: InvitationResponseSchema } }
export const invitationRevokeSchema = { params: MemberRecordParamsSchema, body: MemberChangeSchema, response: { 200: InvitationResponseSchema } }
export const invitationAcceptSchema = { params: MemberRecordParamsSchema, response: { 200: MembershipResponseSchema } }
export const invitationRespondSchema = { params: MemberRecordParamsSchema, response: { 200: InvitationResponseSchema } }
export const memberRequestSchema = { params: MemberOrganizationParamsSchema, body: Type.Object({}, { additionalProperties: false }), response: { 200: MembershipResponseSchema } }
export const memberDecisionSchema = { params: MemberRecordParamsSchema, body: MembershipDecisionSchema, response: { 200: MembershipResponseSchema } }
export const memberLeaveSchema = { params: MemberRecordParamsSchema, body: MemberChangeSchema, response: { 200: MembershipResponseSchema } }
