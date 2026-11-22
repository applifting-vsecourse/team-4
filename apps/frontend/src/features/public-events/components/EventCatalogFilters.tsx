import { useRef, useState } from "react"
import { ChevronDown, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { DatePicker } from "@/components/ui/date-picker"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

import type { CatalogFilter } from "@/features/public-events/api/publicEventSchemas"
import { isCatalogFiltered } from "@/features/public-events/lib/catalogFilter"

type EventCatalogFiltersProps = {
  filter: CatalogFilter
  onChange: (filter: CatalogFilter) => void
}

const textValue = (value: string) => (value.trim() ? value : undefined)

function countActiveFilters(filter: CatalogFilter) {
  return (
    Number(Boolean(filter.place?.trim())) +
    Number(filter.from !== undefined || filter.to !== undefined) +
    Number(filter.open === true)
  )
}

// Veřejný katalog akcí → hledání podle názvu nebo organizátora a filtry podle
// období, místa a otevřeného přihlašování (F54-2b).
export function EventCatalogFilters({ filter, onChange }: EventCatalogFiltersProps) {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const activeFilterCount = countActiveFilters(filter)

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <form
        role="search"
        aria-label="Hledání akcí"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field className="flex-1">
            <FieldLabel htmlFor="catalog-search">Hledat akci</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <Search aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                ref={searchInputRef}
                id="catalog-search"
                type="text"
                role="searchbox"
                value={filter.q ?? ""}
                placeholder="Název akce nebo organizátor"
                onChange={(event) =>
                  onChange({ ...filter, q: textValue(event.currentTarget.value) })
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
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="outline"
              aria-label={`Filtry (${activeFilterCount})`}
              className="group w-fit"
            >
              Filtry ({activeFilterCount})
              <ChevronDown
                aria-hidden="true"
                className="group-data-[state=open]:rotate-180 motion-safe:transition-transform motion-safe:duration-200"
              />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field>
              <FieldLabel htmlFor="catalog-from">Termín od</FieldLabel>
              <DatePicker
                id="catalog-from"
                value={filter.from ?? ""}
                onChange={(from) => onChange({ ...filter, from: from || undefined })}
                placeholder="Libovolný"
                disabledAfter={filter.to}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="catalog-to">Termín do</FieldLabel>
              <DatePicker
                id="catalog-to"
                value={filter.to ?? ""}
                onChange={(to) => onChange({ ...filter, to: to || undefined })}
                placeholder="Libovolný"
                disabledBefore={filter.from}
              />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="catalog-place">Místo</FieldLabel>
              <Input
                id="catalog-place"
                placeholder="např. Podlesí"
                value={filter.place ?? ""}
                onChange={(event) =>
                  onChange({ ...filter, place: textValue(event.currentTarget.value) })
                }
              />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 lg:col-span-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="catalog-open"
                  checked={filter.open ?? false}
                  onCheckedChange={(isChecked) =>
                    onChange({ ...filter, open: isChecked ? true : undefined })
                  }
                />
                <Label htmlFor="catalog-open">Pouze akce s otevřeným přihlašováním</Label>
              </div>
              {isCatalogFiltered(filter) ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onChange({})}
                >
                  <X />
                  Zrušit filtry
                </Button>
              ) : null}
            </div>
          </div>
        </CollapsibleContent>
      </form>
    </Collapsible>
  )
}
