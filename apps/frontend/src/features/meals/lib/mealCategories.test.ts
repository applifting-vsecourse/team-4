import { describe, expect, it } from "vitest"

import { categoryKey, categoryLabel } from "@/features/meals/lib/mealCategories"

describe("categoryLabel", () => {
  it("names no diet as the basic meal", () => {
    expect(categoryLabel({ diets: [] })).toBe("Základní strava")
  })

  it("joins a combination into one portion", () => {
    expect(categoryLabel({ diets: ["vegetarian", "lactose_free"] })).toBe(
      "Vegetariánská + Bezlaktózová",
    )
    expect(categoryKey({ diets: ["vegetarian", "lactose_free"] })).toBe("vegetarian+lactose_free")
  })
})
