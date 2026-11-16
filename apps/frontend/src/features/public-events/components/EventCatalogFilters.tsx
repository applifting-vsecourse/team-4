import { useRef } from "react"
import { Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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

// Veřejný katalog akcí → hledání podle názvu nebo organizátora a filtry podle
// období, místa a otevřeného přihlašování (F54-2b).
export function EventCatalogFilters({ filter, onChange }: EventCatalogFiltersProps) {
  const searchInputRef = useRef<HTMLInputElement>(null)

  return (
    <Card>
      <CardContent>
        <form
          role="search"
          aria-label="Hledání akcí"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(event) => event.preventDefault()}
        >
          <Field className="sm:col-span-2 lg:col-span-4">
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
          <Field>
            <FieldLabel htmlFor="catalog-from">Termín od</FieldLabel>
            <DatePicker
              id="catalog-from"
              value={filter.from ?? ""}
              onChange={(from) => onChange({ ...filter, from: from || undefined })}
              placeholder="Libovolný"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="catalog-to">Termín do</FieldLabel>
            <DatePicker
              id="catalog-to"
              value={filter.to ?? ""}
              onChange={(to) => onChange({ ...filter, to: to || undefined })}
              placeholder="Libovolný"
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="catalog-place">Místo</FieldLabel>
            <Input
              id="catalog-place"
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
            {/* Kept in place while hidden, so the panel never changes height. */}
            <div className={isCatalogFiltered(filter) ? undefined : "invisible"}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onChange({})}
              >
                <X />
                Zrušit filtry
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
