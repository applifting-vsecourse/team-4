import * as React from "react"
import { format, isValid, parse } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cs } from "react-day-picker/locale"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const CALENDAR_DATE = "yyyy-MM-dd"

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
}

/**
 * Popover + Calendar picking one calendar date. Props other than the value go
 * to the trigger button, so `FormControl` can wire its id and aria attributes.
 */
function DatePicker({
  value,
  onChange,
  placeholder = "Vyberte datum",
  className,
  ...props
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = value ? toDate(value) : undefined

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
          onSelect={(date) => {
            onChange(date ? format(date, CALENDAR_DATE) : "")
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
