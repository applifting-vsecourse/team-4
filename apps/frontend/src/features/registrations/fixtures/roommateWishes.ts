import {
  roommateWishesSchema,
  type RoommateWishes,
} from "@/features/registrations/api/roommateWishSchemas"

// Preview data for the roommate wishes of the own registration (S4-05),
// parsed with the API schema so it can't drift from the contract.

const uuid = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`

const CANDIDATES = [
  { registrationId: uuid(901), name: "Adéla Horáková" },
  { registrationId: uuid(902), name: "Barbora Kučerová" },
  { registrationId: uuid(903), name: "Eliška Novotná" },
  { registrationId: uuid(904), name: "Kristýna Dvořáková" },
  { registrationId: uuid(905), name: "Tereza Marešová" },
  { registrationId: uuid(906), name: "Veronika Pokorná" },
]

/** Two wishes stored, more confirmed participants to pick from. */
export const STORED_WISHES: RoommateWishes = roommateWishesSchema.parse({
  candidates: CANDIDATES,
  wishes: [CANDIDATES[1], CANDIDATES[3]],
})

/** Nobody picked yet. */
export const NO_WISHES: RoommateWishes = roommateWishesSchema.parse({
  candidates: CANDIDATES,
  wishes: [],
})

/** The participant is the only confirmed one so far. */
export const NO_CANDIDATES: RoommateWishes = roommateWishesSchema.parse({
  candidates: [],
  wishes: [],
})
