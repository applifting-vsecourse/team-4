import { z } from "zod"

/** The fixed offer of diets (F63); several can be combined in one portion. */
export const mealDietSchema = z.enum(["vegetarian", "vegan", "gluten_free", "lactose_free"])

/** The diets of one meal category; empty is the basic meal. */
export const mealCategorySchema = z.object({
  diets: z.array(mealDietSchema),
  count: z.number().int(),
})

export const mealDaySchema = z.object({
  date: z.string(),
  total: z.number().int(),
  categories: z.array(mealCategorySchema),
})

/** The participant's own words on food; not interpreted as a diet. */
export const mealNoteSchema = z.object({
  registrationId: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  note: z.string(),
})

/** Daily meal counts of a term by diet category (S5-04). */
export const mealOverviewSchema = z.object({
  termId: z.string().uuid(),
  termLabel: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  participants: z.number().int(),
  days: z.array(mealDaySchema),
  notes: z.array(mealNoteSchema),
})

export type MealCategory = z.infer<typeof mealCategorySchema>
export type MealDay = z.infer<typeof mealDaySchema>
export type MealNote = z.infer<typeof mealNoteSchema>
export type MealOverview = z.infer<typeof mealOverviewSchema>
