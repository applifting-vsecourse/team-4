import { type Organization } from "@/features/organizations/api/organizationSchemas"

// The last own organization the account worked in (S2-02), per account, so a
// shared browser does not carry one organizer's choice over to another. The
// active organization itself is always the one in the URL (data-model.md
// §3.2); this is only the fallback when the URL names none that is available.

const key = (userId: string) => `akcio:last-organization:${userId}`

/** Storage can be blocked or full; remembering is a convenience, never required. */
export function rememberOrganization(userId: string, organizationId: string) {
  try {
    localStorage.setItem(key(userId), organizationId)
  } catch {
    // Without storage the fallback is the first organization by name.
  }
}

export function lastOrganization(userId: string): string | undefined {
  try {
    return localStorage.getItem(key(userId)) ?? undefined
  } catch {
    return undefined
  }
}

/**
 * Where "Zpět na přehled akcí" leads (S2-03): the organization of the URL if it
 * is one of the own, otherwise the last used one that is still own, otherwise
 * the first by name. `organizations` come from the API, already by name.
 */
export function chooseOrganization(
  organizations: Organization[],
  { fromUrl, lastUsed }: { fromUrl?: string; lastUsed?: string },
): Organization | undefined {
  const own = (id?: string) => organizations.find((organization) => organization.id === id)
  return own(fromUrl) ?? own(lastUsed) ?? organizations[0]
}
