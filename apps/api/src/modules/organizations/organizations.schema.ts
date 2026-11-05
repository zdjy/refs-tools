import {
  CreateOrganizationSchema, OrganizationDecisionSchema, OrganizationListResponseSchema,
  OrganizationParamsSchema, OrganizationQuerySchema, OrganizationResponseSchema, UpdateOrganizationSchema,
} from '@refs-tools/contracts/organizations'

export const listOrganizationsSchema = { querystring: OrganizationQuerySchema, response: { 200: OrganizationListResponseSchema } }
export const detailOrganizationSchema = { params: OrganizationParamsSchema, response: { 200: OrganizationResponseSchema } }
export const createOrganizationSchema = { body: CreateOrganizationSchema, response: { 201: OrganizationResponseSchema } }
export const decideOrganizationSchema = { params: OrganizationParamsSchema, body: OrganizationDecisionSchema, response: { 200: OrganizationResponseSchema } }
export const updateOrganizationSchema = { params: OrganizationParamsSchema, body: UpdateOrganizationSchema, response: { 200: OrganizationResponseSchema } }
