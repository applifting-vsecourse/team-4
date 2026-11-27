import { mealOverviewSchema, type MealOverview } from "@/features/meals/api/mealSchemas"

// Preview data, parsed with the API schema so it can't drift from the
// contract. Term ids match the event fixtures.

const uuid = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`

const dayRange = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `2027-07-${String(from + i).padStart(2, "0")}`)

const categories = [
  { diets: [], count: 14 },
  { diets: ["vegetarian"], count: 5 },
  { diets: ["vegan"], count: 1 },
  { diets: ["vegetarian", "lactose_free"], count: 2 },
  { diets: ["gluten_free"], count: 2 },
]

/** Turnus 1 of the open summer camp: 24 confirmed participants on each of its 14 days. */
export const MEAL_OVERVIEW: MealOverview = mealOverviewSchema.parse({
  termId: uuid(101),
  termLabel: "Turnus 1",
  startDate: "2027-07-04",
  endDate: "2027-07-17",
  participants: 24,
  days: dayRange(4, 17).map((date) => ({ date, total: 24, categories })),
  notes: [
    {
      registrationId: uuid(601),
      firstName: "Eliška",
      lastName: "Svobodová",
      note: "Alergie na ořechy, stopy nevadí.",
    },
    {
      registrationId: uuid(602),
      firstName: "Jakub",
      lastName: "Dvořák",
      note: "Bez ryb.",
    },
  ],
})

/** Turnus 2 has nobody confirmed yet. */
export const MEAL_OVERVIEW_EMPTY: MealOverview = mealOverviewSchema.parse({
  termId: uuid(102),
  termLabel: "Turnus 2",
  startDate: "2027-08-01",
  endDate: "2027-08-14",
  participants: 0,
  days: [],
  notes: [],
})

const daysBetween = (start: string, end: string) => {
  const days: string[] = []
  for (
    let time = Date.parse(`${start}T00:00:00Z`);
    time <= Date.parse(`${end}T00:00:00Z`);
    time += 86_400_000
  ) {
    days.push(new Date(time).toISOString().slice(0, 10))
  }
  return days
}

/** A six-week stay: 45 days, more rows than fit on one printed page. */
export const MEAL_OVERVIEW_LONG: MealOverview = mealOverviewSchema.parse({
  ...MEAL_OVERVIEW,
  termLabel: "Prázdninový pobyt",
  startDate: "2027-08-01",
  endDate: "2027-09-14",
  days: daysBetween("2027-08-01", "2027-09-14").map((date) => ({ date, total: 24, categories })),
})
