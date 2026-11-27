import type { MealCategory, MealOverview } from "@/features/meals/api/mealSchemas"

type Diet = MealCategory["diets"][number]

const DIET_LABELS: Record<Diet, string> = {
  vegetarian: "Vegetariánská",
  vegan: "Veganská",
  gluten_free: "Bezlepková",
  lactose_free: "Bezlaktózová",
}

export const BASIC_MEAL = "Základní strava"

/** The short marks of the table header; a legend names the ones in use. */
const ABBREVIATIONS: Record<Diet, string> = {
  vegetarian: "VEG",
  vegan: "VGN",
  gluten_free: "BLP",
  lactose_free: "BLK",
}

export const BASIC_ABBREVIATION = "ZÁK"

/** "Základní strava", "Veganská" or a combined portion: "Vegetariánská + Bezlaktózová". */
export const categoryLabel = (category: Pick<MealCategory, "diets">) =>
  category.diets.length === 0
    ? BASIC_MEAL
    : category.diets.map((diet) => DIET_LABELS[diet]).join(" + ")

/** "ZÁK", "VGN" or a combination: "VEG + BLK". */
export const categoryAbbreviation = (category: Pick<MealCategory, "diets">) =>
  category.diets.length === 0
    ? BASIC_ABBREVIATION
    : category.diets.map((diet) => ABBREVIATIONS[diet]).join(" + ")

/** Stable identity of a category across days. */
export const categoryKey = (category: Pick<MealCategory, "diets">) => category.diets.join("+")

/** The categories somebody belongs to on any day: the columns of the table. */
export function mealColumns(overview: MealOverview): MealCategory[] {
  const columns = new Map<string, MealCategory>()
  for (const day of overview.days) {
    for (const category of day.categories) columns.set(categoryKey(category), category)
  }
  return [...columns.values()]
}

/** The abbreviations in use with their full names, basic meal first. */
export function mealLegend(columns: Pick<MealCategory, "diets">[]) {
  const used = new Set(columns.flatMap((column) => column.diets))
  const entries = [
    ...(columns.some((column) => column.diets.length === 0)
      ? [{ abbreviation: BASIC_ABBREVIATION, label: BASIC_MEAL }]
      : []),
    ...(Object.keys(ABBREVIATIONS) as Diet[])
      .filter((diet) => used.has(diet))
      .map((diet) => ({ abbreviation: ABBREVIATIONS[diet], label: DIET_LABELS[diet] })),
  ]
  return entries
}
