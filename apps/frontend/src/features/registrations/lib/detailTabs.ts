import { z } from "zod"

/** The tabs of the organizer's registration detail (F38-1), in display order. */
export const registrationDetailTabSchema = z.enum([
  "personal",
  "terms",
  "accommodation",
  "payments",
  "needs",
  "history",
])

export type RegistrationDetailTab = z.infer<typeof registrationDetailTabSchema>

export const REGISTRATION_DETAIL_TABS: readonly { value: RegistrationDetailTab; label: string }[] =
  [
    { value: "personal", label: "Osobní údaje" },
    { value: "terms", label: "Termíny" },
    { value: "accommodation", label: "Ubytování" },
    { value: "payments", label: "Platby" },
    { value: "needs", label: "Potřeby" },
    { value: "history", label: "Historie" },
  ]

/** Without a target, or with an unknown one, the detail opens the contact data. */
export const DEFAULT_REGISTRATION_DETAIL_TAB: RegistrationDetailTab = "personal"
