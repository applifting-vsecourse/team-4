import { useQuery } from "@tanstack/react-query"

import { BrandMark } from "@/components/BrandMark"
import { formatCalendarRange, formatPragueDate } from "@/lib/date"

import { mealOverviewQueryOptions } from "@/features/meals/api/mealQueryOptions"
import { MealCountsTable } from "@/features/meals/components/MealCountsTable"
import { MealLegend } from "@/features/meals/components/MealLegend"

type MealsPrintSummaryProps = {
  organizationId: string
  eventId: string
  termId: string
  eventName: string
}

// What the kitchen gets on paper: the event, the term, the day it was made and
// the counts. No names, notes, payments or health data, and no app navigation;
// it is on the page only while printing.
export function MealsPrintSummary({
  organizationId,
  eventId,
  termId,
  eventName,
}: MealsPrintSummaryProps) {
  const { data } = useQuery(mealOverviewQueryOptions(organizationId, eventId, termId))
  if (data?.termId !== termId || data.participants === 0) return null

  return (
    <article
      aria-label="Souhrn stravování pro kuchyň"
      data-print-light
      className="hidden space-y-4 bg-background text-foreground print:block"
    >
      <BrandMark isLarge />
      <header className="space-y-1">
        <h1 className="text-h2">{eventName}</h1>
        <p>
          {data.termLabel} · {formatCalendarRange(data.startDate, data.endDate)}
        </p>
        <p className="text-sm">Vytvořeno {formatPragueDate(new Date().toISOString())}</p>
      </header>
      <h2 className="text-h4">Denní počty strávníků</h2>
      <MealLegend overview={data} />
      <MealCountsTable
        overview={data}
        isPrint
      />
    </article>
  )
}
