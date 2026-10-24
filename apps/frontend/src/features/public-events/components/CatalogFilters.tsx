import { useId } from "react"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  AGE_GROUPS,
  type CatalogFilter,
  type catalogFilterOptions,
} from "@/features/public-events/lib/catalogFilter"

// Radix Select has no empty value; this one stands for "any".
const ANY = "any"

type CatalogFiltersProps = {
  filter: CatalogFilter
  options: ReturnType<typeof catalogFilterOptions>
  onChange: (filter: CatalogFilter) => void
}

// Term, place and age group (F54-2). Each change applies at once; on a phone
// the same fields sit in a sheet.
export function CatalogFilters({ filter, options, onChange }: CatalogFiltersProps) {
  const id = useId()
  const set = (key: keyof CatalogFilter, value: string) =>
    onChange({ ...filter, [key]: value === ANY ? undefined : value })

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="grid gap-2">
        <Label htmlFor={`${id}-month`}>Termín</Label>
        <Select
          value={filter.month ?? ANY}
          onValueChange={(value) => set("month", value)}
        >
          <SelectTrigger
            id={`${id}-month`}
            className="w-full"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Kdykoli</SelectItem>
            {options.months.map((month) => (
              <SelectItem
                key={month.value}
                value={month.value}
              >
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${id}-region`}>Místo</Label>
        <Select
          value={filter.region ?? ANY}
          onValueChange={(value) => set("region", value)}
        >
          <SelectTrigger
            id={`${id}-region`}
            className="w-full"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Kdekoli</SelectItem>
            {options.regions.map((region) => (
              <SelectItem
                key={region}
                value={region}
              >
                {region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${id}-age`}>Věk</Label>
        <Select
          value={filter.ageGroup ?? ANY}
          onValueChange={(value) => set("ageGroup", value)}
        >
          <SelectTrigger
            id={`${id}-age`}
            className="w-full"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Jakýkoli věk</SelectItem>
            {AGE_GROUPS.map((group) => (
              <SelectItem
                key={group.id}
                value={group.id}
              >
                {group.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
