import {
  CreateOwnershipTransferSchema, DecideOwnershipTransferSchema, OwnershipTransferListResponseSchema, OwnershipTransferParamsSchema,
  OwnershipTransferResponseSchema, PlatformOwnershipTransferSchema,
} from '@refs-tools/contracts/organization-ownership'
import { MemberOrganizationParamsSchema } from '@refs-tools/contracts/organization-members'
import { OrganizationParamsSchema, OrganizationResponseSchema } from '@refs-tools/contracts/organizations'
import { PageQuerySchema } from '@refs-tools/contracts/pagination'

const organization = { params: MemberOrganizationParamsSchema }
const decision = { params: OwnershipTransferParamsSchema, body: DecideOwnershipTransferSchema, response: { 200: OwnershipTransferResponseSchema } }
export const incomingTransferSchema = { querystring: PageQuerySchema, response: { 200: OwnershipTransferListResponseSchema } }
export const transferListSchema = { ...organization, querystring: PageQuerySchema, response: { 200: OwnershipTransferListResponseSchema } }
export const transferCreateSchema = { ...organization, body: CreateOwnershipTransferSchema, response: { 201: OwnershipTransferResponseSchema } }
export const transferAcceptSchema = decision
export const transferDeclineSchema = decision
export const transferCancelSchema = decision
export const platformTransferSchema = {
  params: OrganizationParamsSchema, body: PlatformOwnershipTransferSchema, response: { 200: OrganizationResponseSchema },
}
