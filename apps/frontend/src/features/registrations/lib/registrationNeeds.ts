import { z } from "zod"

import {
  dietChoiceSchema,
  registrationNeedsSchema,
  type DietChoice,
  type RegistrationNeeds,
  type TransportChoice,
} from "@/features/registrations/api/registrationSchemas"

// Transport, diet and health (F63): the limits the server enforces, how the
// form compares them and how both detail views word them.

export const TRANSPORT_LABELS: Record<TransportChoice, string> = {
  own: "Vlastní doprava",
  shared: "Společná doprava",
}

export const DIET_LABELS: Record<DietChoice, string> = {
  vegetarian: "Vegetariánská",
  vegan: "Veganská",
  gluten_free: "Bezlepková",
  lactose_free: "Bezlaktózová",
}

export const DIET_CHOICES = dietChoiceSchema.options

export const NOT_PROVIDED = "Neuvedeno"

export const NO_DIET_RESTRICTION = "Bez omezení"

export type RegistrationNeedsErrors = Partial<
  Record<"transportNote" | "diet" | "dietNote" | "health", string>
>

export const registrationNeedsFormSchema = registrationNeedsSchema
  .extend({
    transportNote: z.string().trim().max(500, "Poznámka k dopravě může mít nejvýše 500 znaků."),
    dietNote: z.string().trim().max(500, "Vlastní text ke stravě může mít nejvýše 500 znaků."),
    health: z.string().trim().max(2000, "Zdravotní omezení mohou mít nejvýše 2000 znaků."),
  })
  .refine((needs) => !(needs.hasNoDietRestriction && needs.diet.length > 0), {
    path: ["diet"],
    message: "„Bez omezení“ nejde vybrat spolu s jinou volbou stravy.",
  })

/** The same checks as the server; empty when the needs can be saved. */
export function validateNeeds(needs: RegistrationNeeds): RegistrationNeedsErrors {
  const result = registrationNeedsFormSchema.safeParse(needs)
  if (result.success) return {}
  const errors: RegistrationNeedsErrors = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof RegistrationNeedsErrors
    errors[field] ??= issue.message
  }
  return errors
}

/** Trimmed text and the diet in a fixed order, as the server stores them. */
export const normalizeNeeds = (needs: RegistrationNeeds): RegistrationNeeds => ({
  transport: needs.transport,
  transportNote: needs.transportNote.trim(),
  hasNoDietRestriction: needs.hasNoDietRestriction,
  diet: DIET_CHOICES.filter((choice) => needs.diet.includes(choice)),
  dietNote: needs.dietNote.trim(),
  health: needs.health.trim(),
})

export const sameNeeds = (a: RegistrationNeeds, b: RegistrationNeeds) =>
  JSON.stringify(normalizeNeeds(a)) === JSON.stringify(normalizeNeeds(b))

/** E.g. "Společná doprava · Nastupujeme v Pardubicích."; "Neuvedeno" when empty. */
export function formatTransport(needs: RegistrationNeeds) {
  const parts = [needs.transport ? TRANSPORT_LABELS[needs.transport] : "", needs.transportNote]
  return parts.filter(Boolean).join(" · ") || NOT_PROVIDED
}

/** E.g. "Vegetariánská, Bezlaktózová · Bez ořechů."; empty never reads "Bez omezení". */
export function formatDiet(needs: RegistrationNeeds) {
  const choices = needs.hasNoDietRestriction
    ? NO_DIET_RESTRICTION
    : needs.diet.map((choice) => DIET_LABELS[choice]).join(", ")
  return [choices, needs.dietNote].filter(Boolean).join(" · ") || NOT_PROVIDED
}

export const formatHealth = (needs: RegistrationNeeds) => needs.health || NOT_PROVIDED
