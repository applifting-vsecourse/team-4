import { z } from "zod"

// Přání na spolubydlící (S4-05): a confirmed participant picks other confirmed
// participants of the same event. One wish list per registration, i.e. for the
// whole event, not per term; only its author and the organizers see it.

/** Another participant of the event, named as the participant sees them. */
export const roommateSchema = z.object({
  registrationId: z.string().uuid(),
  name: z.string(),
})

export const roommateWishesSchema = z.object({
  /** Other confirmed participants of the event; never the author. */
  candidates: z.array(roommateSchema),
  /** The stored wishes; may name someone who is no longer a candidate. */
  wishes: z.array(roommateSchema),
})

/** The whole list replaces the stored one; an empty list removes every wish. */
export const roommateWishesInputSchema = z.object({
  registrationIds: z.array(z.string().uuid()),
})

export type Roommate = z.infer<typeof roommateSchema>
export type RoommateWishes = z.infer<typeof roommateWishesSchema>
export type RoommateWishesInput = z.infer<typeof roommateWishesInputSchema>
