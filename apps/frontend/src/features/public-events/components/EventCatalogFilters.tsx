import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const ALL_OPTIONS = "all"

export type CatalogFilterOption = { value: string; label: string }

export type CatalogFilterValues = {
  /** `yyyy-MM-dd`, or "" when not set. */
  dateFrom: string
  dateTo: string
  /** An option value, or `ALL_OPTIONS`. */
  place: string
  ageGroup: string
}

type EventCatalogFiltersProps = {
  values: CatalogFilterValues
  placeOptions: CatalogFilterOption[]
  ageGroupOptions: CatalogFilterOption[]
  /** Shows the "Vymazat filtry" button. */
  hasActiveFilters: boolean
  onChange: (values: CatalogFilterValues) => void
  onClear: () => void
}

// Veřejný katalog akcí → filtry podle termínu, místa a věkové skupiny (F54-2).
// Design only: every value is passed in.
export function EventCatalogFilters({
  values,
  placeOptions,
  ageGroupOptions,
  hasActiveFilters,
  onChange,
  onClear,
}: EventCatalogFiltersProps) {
  return (
    <form
      aria-label="Filtry akcí"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <Field>
        <FieldLabel htmlFor="catalog-date-from">Termín od</FieldLabel>
        <DatePicker
          id="catalog-date-from"
          value={values.dateFrom}
          onChange={(dateFrom) => onChange({ ...values, dateFrom })}
          placeholder="Libovolný"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="catalog-date-to">Termín do</FieldLabel>
        <DatePicker
          id="catalog-date-to"
          value={values.dateTo}
          onChange={(dateTo) => onChange({ ...values, dateTo })}
          placeholder="Libovolný"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="catalog-place">Místo</FieldLabel>
        <Select
          defaultValue={values.place}
          onValueChange={(place) => onChange({ ...values, place })}
        >
          <SelectTrigger
            id="catalog-place"
            className="w-full"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_OPTIONS}>Všechna místa</SelectItem>
            {placeOptions.map((option) => (
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
      <Field>
        <FieldLabel htmlFor="catalog-age-group">Věková skupina</FieldLabel>
        <Select
          defaultValue={values.ageGroup}
          onValueChange={(ageGroup) => onChange({ ...values, ageGroup })}
        >
          <SelectTrigger
            id="catalog-age-group"
            className="w-full"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_OPTIONS}>Všechny věkové skupiny</SelectItem>
            {ageGroupOptions.map((option) => (
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
      {hasActiveFilters ? (
        <div className="sm:col-span-2 lg:col-span-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClear}
          >
            Vymazat filtry
          </Button>
        </div>
      ) : null}
    </form>
  )
}
