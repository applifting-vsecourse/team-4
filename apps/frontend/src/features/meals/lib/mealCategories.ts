import type { MealCategory } from "@/features/meals/api/mealSchemas"

const DIET_LABELS: Record<MealCategory["diets"][number], string> = {
  vegetarian: "Vegetariánská",
  vegan: "Veganská",
  gluten_free: "Bezlepková",
  lactose_free: "Bezlaktózová",
}

export const BASIC_MEAL = "Základní strava"

/** "Základní strava", "Veganská" or a combined portion: "Vegetariánská + Bezlaktózová". */
export const categoryLabel = (category: Pick<MealCategory, "diets">) =>
  category.diets.length === 0
    ? BASIC_MEAL
    : category.diets.map((diet) => DIET_LABELS[diet]).join(" + ")

/** Stable identity of a category across days. */
export const categoryKey = (category: Pick<MealCategory, "diets">) => category.diets.join("+")
