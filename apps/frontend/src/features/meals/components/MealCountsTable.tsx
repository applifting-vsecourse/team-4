import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCalendarDate, formatCalendarWeekday } from "@/lib/date"

import type { MealOverview } from "@/features/meals/api/mealSchemas"
import {
  categoryAbbreviation,
  categoryKey,
  categoryLabel,
  mealColumns,
} from "@/features/meals/lib/mealCategories"

type MealCountsTableProps = {
  overview: MealOverview
  /** Names the scrollable region on screen; the printout has no scroll. */
  containerLabel?: string
  /** The printout: equal columns that always fit the page width. */
  isPrint?: boolean
}

// Den × stravovací kategorie: the confirmed participants eating each category
// that day, and the day's total. Only categories somebody belongs to are columns.
export function MealCountsTable({
  overview,
  containerLabel,
  isPrint = false,
}: MealCountsTableProps) {
  const columns = mealColumns(overview)

  return (
    <Table
      containerLabel={containerLabel}
      className={isPrint ? "table-fixed" : undefined}
    >
      <TableHeader>
        <TableRow>
          <TableHead>Den</TableHead>
          {columns.map((column) => (
            <TableHead
              key={categoryKey(column)}
              className="text-right"
            >
              <abbr
                title={categoryLabel(column)}
                className="no-underline"
              >
                {categoryAbbreviation(column)}
              </abbr>
            </TableHead>
          ))}
          <TableHead className="text-right">Celkem osob</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {overview.days.map((day) => (
          <TableRow key={day.date}>
            <TableCell>
              <span className="font-medium">
                {formatCalendarWeekday(day.date)} {formatCalendarDate(day.date)}
              </span>
            </TableCell>
            {columns.map((column) => {
              const count =
                day.categories.find((category) => categoryKey(category) === categoryKey(column))
                  ?.count ?? 0
              return (
                <TableCell
                  key={categoryKey(column)}
                  className="text-right"
                >
                  <span className="font-mono tabular-nums">{count}</span>
                </TableCell>
              )
            })}
            <TableCell className="text-right">
              <span className="font-mono font-semibold tabular-nums">{day.total}</span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
