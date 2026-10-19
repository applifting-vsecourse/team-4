import type { Organization } from "@/features/organizations/api/organizationSchemas"

// The remembered choice belongs to one signed-in account and only decides where
// a regular sign-in lands; the organization in the URL always wins.
const storageKey = (userId: string) => `akcio:last-organization:${userId}`

export function rememberOrganization(userId: string, organizationId: string) {
  try {
    localStorage.setItem(storageKey(userId), organizationId)
  } catch {
    // storage unavailable (private window, blocked site data): the default applies
  }
}

export function recallOrganization(userId: string): string | null {
  try {
    return localStorage.getItem(storageKey(userId))
  } catch {
    return null
  }
}

/**
 * The remembered organization if it is still one of the user's own, otherwise
 * the first by name (the API returns them sorted); `null` for an account
 * without organizations.
 */
export function pickEntryOrganization(
  organizations: Organization[],
  rememberedId: string | null,
): Organization | null {
  return (
    organizations.find((organization) => organization.id === rememberedId) ??
    organizations[0] ??
    null
  )
}
