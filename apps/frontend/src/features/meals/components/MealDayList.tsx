import { formatCalendarDate, formatCalendarWeekday } from "@/lib/date"

import type { MealOverview } from "@/features/meals/api/mealSchemas"
import { categoryKey, categoryLabel } from "@/features/meals/lib/mealCategories"

// The daily counts on a phone (360 px), where the wide table does not fit:
// per day the weekday and date, the total of persons and the categories that
// have somebody in them.
export function MealDayList({ overview }: { overview: MealOverview }) {
  return (
    <ul className="divide-y divide-border rounded-lg border md:hidden">
      {overview.days.map((day) => (
        <li
          key={day.date}
          className="space-y-1 px-4 py-3 text-sm"
        >
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-medium">
              {formatCalendarWeekday(day.date)} {formatCalendarDate(day.date)}
            </p>
            <p>
              <span className="text-muted-foreground">Celkem osob </span>
              <span className="font-mono font-semibold tabular-nums">{day.total}</span>
            </p>
          </div>
          <ul className="space-y-0.5 text-muted-foreground">
            {day.categories
              .filter((category) => category.count > 0)
              .map((category) => (
                <li
                  key={categoryKey(category)}
                  className="flex justify-between gap-4"
                >
                  <span>{categoryLabel(category)}</span>
                  <span className="font-mono tabular-nums">{category.count}</span>
                </li>
              ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}
