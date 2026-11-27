import { describe, expect, it } from "vitest"

import {
  categoryAbbreviation,
  categoryKey,
  categoryLabel,
  mealLegend,
} from "@/features/meals/lib/mealCategories"

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

describe("categoryAbbreviation", () => {
  it("abbreviates single categories and combinations", () => {
    expect(categoryAbbreviation({ diets: [] })).toBe("ZÁK")
    expect(categoryAbbreviation({ diets: ["vegan"] })).toBe("VGN")
    expect(categoryAbbreviation({ diets: ["gluten_free"] })).toBe("BLP")
    expect(categoryAbbreviation({ diets: ["vegetarian", "lactose_free"] })).toBe("VEG + BLK")
  })
})

describe("mealLegend", () => {
  it("names only the abbreviations in use, basic meal first", () => {
    expect(
      mealLegend([{ diets: ["lactose_free", "vegetarian"] }, { diets: [] }, { diets: ["vegan"] }]),
    ).toEqual([
      { abbreviation: "ZÁK", label: "Základní strava" },
      { abbreviation: "VEG", label: "Vegetariánská" },
      { abbreviation: "VGN", label: "Veganská" },
      { abbreviation: "BLK", label: "Bezlaktózová" },
    ])
  })

  it("has no basic meal entry when nobody eats it", () => {
    expect(mealLegend([{ diets: ["vegan"] }])).toEqual([{ abbreviation: "VGN", label: "Veganská" }])
  })
})
