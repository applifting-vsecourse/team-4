import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  paymentStateSchema,
  type RegistrationFilter,
} from "@/features/registrations/api/eventRegistrationSchemas"
import { participationStatusSchema } from "@/features/registrations/api/registrationSchemas"
import { PARTICIPATION_LABELS } from "@/features/registrations/components/ParticipationBadge"
import { PAYMENT_STATE_LABELS } from "@/features/registrations/components/PaymentStateBadge"

// A select cannot hold an empty value, so "no filter" has its own.
const ALL = "all"

type RegistrationFiltersProps = {
  /** Terms of this event only. */
  terms: { id: string; label: string }[]
  filter: RegistrationFilter
  onChange: (filter: RegistrationFilter) => void
}

export function RegistrationFilters({ terms, filter, onChange }: RegistrationFiltersProps) {
  const isFiltered = Boolean(filter.termId ?? filter.status ?? filter.payment)
  const set = (key: keyof RegistrationFilter, value: string) =>
    onChange({ ...filter, [key]: value === ALL ? undefined : value })

  return (
    <div className="flex flex-wrap items-end gap-3">
      <FilterSelect
        id="filter-term"
        label="Termín"
        value={filter.termId}
        onValueChange={(value) => set("termId", value)}
        options={terms.map((term) => ({ value: term.id, label: term.label }))}
        allLabel="Všechny termíny"
      />
      <FilterSelect
        id="filter-status"
        label="Stav účasti"
        value={filter.status}
        onValueChange={(value) => set("status", value)}
        options={participationStatusSchema.options.map((status) => ({
          value: status,
          label: PARTICIPATION_LABELS[status],
        }))}
        allLabel="Všechny stavy"
      />
      <FilterSelect
        id="filter-payment"
        label="Platba"
        value={filter.payment}
        onValueChange={(value) => set("payment", value)}
        options={paymentStateSchema.options.map((state) => ({
          value: state,
          label: PAYMENT_STATE_LABELS[state],
        }))}
        allLabel="Všechny platby"
      />
      {isFiltered ? (
        <Button
          variant="ghost"
          onClick={() => onChange({})}
        >
          <X />
          Zrušit filtry
        </Button>
      ) : null}
    </div>
  )
}

type FilterSelectProps = {
  id: string
  label: string
  value: string | undefined
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
  allLabel: string
}

function FilterSelect({ id, label, value, onValueChange, options, allLabel }: FilterSelectProps) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value ?? ALL}
        onValueChange={onValueChange}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
