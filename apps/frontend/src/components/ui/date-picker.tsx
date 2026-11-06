import * as React from "react"
import { format, isValid, parse } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cs } from "react-day-picker/locale"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const CALENDAR_DATE = "yyyy-MM-dd"

// Without an end, react-day-picker stops at December of the current year, so
// terms for next season could not be picked.
const YEARS_AHEAD = 5

// A calendar date has no time zone, so it is parsed and formatted in the
// viewer's local calendar: the chosen day is the stored day.
function toDate(value: string) {
  const date = parse(value, CALENDAR_DATE, new Date())
  return isValid(date) ? date : undefined
}

type DatePickerProps = Omit<React.ComponentProps<typeof Button>, "value" | "onChange"> & {
  /** `yyyy-MM-dd`, or "" when nothing is chosen. */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Days marked as taken (`yyyy-MM-dd`, both ends included); they stay selectable. */
  markedRanges?: { from: string; to: string }[]
  /** Explains the marked days under the calendar. */
  markedLegend?: string
}

/**
 * Popover + Calendar picking one calendar date. Props other than the value go
 * to the trigger button, so `FormControl` can wire its id and aria attributes.
 */
function DatePicker({
  value,
  onChange,
  placeholder = "Vyberte datum",
  markedRanges = [],
  markedLegend,
  className,
  ...props
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = value ? toDate(value) : undefined
  const marked = markedRanges.flatMap(({ from, to }) => {
    const start = toDate(from)
    const end = toDate(to)
    return start && end ? [{ from: start, to: end }] : []
  })

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          data-slot="date-picker"
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
          {...props}
        >
          {selected ? format(selected, "d. M. yyyy") : placeholder}
          <CalendarIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
      >
        <Calendar
          mode="single"
          locale={cs}
          captionLayout="dropdown"
          selected={selected}
          defaultMonth={selected}
          endMonth={new Date(new Date().getFullYear() + YEARS_AHEAD, 11)}
          modifiers={{ marked }}
          modifiersClassNames={{
            marked:
              "[&>button]:bg-destructive-subtle [&>button]:text-destructive-subtle-foreground [&>button]:underline [&>button]:decoration-dotted",
          }}
          onSelect={(date) => {
            onChange(date ? format(date, CALENDAR_DATE) : "")
            setOpen(false)
          }}
        />
        {marked.length > 0 && markedLegend ? (
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">
            <span
              aria-hidden
              className="mr-2 inline-block size-2.5 rounded-sm bg-destructive-subtle align-middle ring-1 ring-destructive-subtle-foreground"
            />
            {markedLegend}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
