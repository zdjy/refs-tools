export type { ISODateTime, UUID } from '@refs-tools/contracts'
export { permissions, isAuthorizationContextAllowed, isRoleBindingActive, isValidRoleScope, scopeCoversResource } from './permissions.js'
export type { Permission, PermissionContext, ResourceScope } from './permissions.js'
export { validateMediaPolicy } from './media-policy.js'
export type { MediaPolicyError } from './media-policy.js'
export {
  ADDRESS_MAX, BIRTH_DATE_PATTERN, LEGAL_NAME_MAX, NICKNAME_MAX, PHONE_PATTERN, REGION_CODE_PATTERN, REGION_LABEL_MAX,
  normalizeProfileText, validateProfile,
} from './profile.js'
export type { ProfileFields, ProfileValidationError } from './profile.js'
export { membershipStatusAfter } from './membership-state.js'
export { joinCodeStatus } from './join-code.js'
export { organizationStatusAfter } from './organization-state.js'
export { createGb2312Codec } from './gb2312.js'
export type {
  Gb2312BatchResult, Gb2312CharacterResult, Gb2312CodeFields, Gb2312Codec, Gb2312Decoder, Gb2312LookupStatus, Gb2312Reason,
} from './gb2312.js'
