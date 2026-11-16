import { useRef } from "react"
import { Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PARTICIPATION_LABELS } from "@/lib/participation"

import {
  paymentStateSchema,
  type RegistrationFilter,
} from "@/features/registrations/api/eventRegistrationSchemas"
import { activeParticipationStatusSchema } from "@/features/registrations/api/registrationSchemas"
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
  const searchInputRef = useRef<HTMLInputElement>(null)
  const isFiltered = Boolean(filter.termId ?? filter.status ?? filter.payment ?? filter.q?.trim())
  const set = (key: keyof RegistrationFilter, value: string) =>
    onChange({ ...filter, [key]: value === ALL ? undefined : value })

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:items-end">
        <Field className="min-w-0 lg:flex-1">
          <FieldLabel htmlFor="filter-search">Hledat účastníka</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <Search
                aria-hidden="true"
                className="transition-[color,transform] duration-200 ease-out group-focus-within/input-group:scale-110 group-focus-within/input-group:text-foreground"
              />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchInputRef}
              id="filter-search"
              type="text"
              role="searchbox"
              value={filter.q ?? ""}
              placeholder="Jméno nebo e-mail"
              onChange={(event) =>
                onChange({
                  ...filter,
                  q: event.currentTarget.value.trim() ? event.currentTarget.value : undefined,
                })
              }
            />
            {filter.q ? (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  aria-label="Vymazat hledání"
                  title="Vymazat hledání"
                  size="icon-sm"
                  onClick={() => {
                    onChange({ ...filter, q: undefined })
                    searchInputRef.current?.focus()
                  }}
                >
                  <X aria-hidden="true" />
                </InputGroupButton>
              </InputGroupAddon>
            ) : null}
          </InputGroup>
        </Field>
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
          options={activeParticipationStatusSchema.options.map((status) => ({
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
          <div className="grid min-w-0 gap-1.5 self-end lg:flex-none">
            <Button
              variant="ghost"
              onClick={() => onChange({})}
            >
              <X />
              Zrušit filtry
            </Button>
          </div>
        ) : null}
      </div>
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
    <Field className="min-w-0 lg:flex-1">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        value={value ?? ALL}
        onValueChange={onValueChange}
      >
        <SelectTrigger
          id={id}
          className="w-full"
        >
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
    </Field>
  )
}
