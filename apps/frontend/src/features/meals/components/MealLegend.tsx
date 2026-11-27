import { Badge } from "@/components/ui/badge"

import type { MealOverview } from "@/features/meals/api/mealSchemas"
import { mealColumns, mealLegend } from "@/features/meals/lib/mealCategories"

// Full names of the abbreviations the table header uses; only the ones in use.
export function MealLegend({ overview }: { overview: MealOverview }) {
  const entries = mealLegend(mealColumns(overview))
  return (
    <ul
      aria-label="Legenda zkratek"
      className="flex flex-wrap gap-x-5 gap-y-2 text-sm"
    >
      {entries.map((entry) => (
        <li
          key={entry.abbreviation}
          className="flex items-center gap-2"
        >
          <Badge variant="outline">{entry.abbreviation}</Badge>
          <span>{entry.label}</span>
        </li>
      ))}
    </ul>
  )
}
