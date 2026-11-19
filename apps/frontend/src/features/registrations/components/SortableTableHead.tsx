import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TableHead } from "@/components/ui/table"

export type SortDirection = "asc" | "desc"

type SortableTableHeadProps = {
  label: string
  /** Null while the table is sorted by another column. */
  direction: SortDirection | null
  onSort: () => void
  /** Amounts are right-aligned, with their header. */
  isNumeric?: boolean
}

// A column header that sorts its table; the arrow and `aria-sort` mark the
// active column and its direction.
export function SortableTableHead({
  label,
  direction,
  onSort,
  isNumeric = false,
}: SortableTableHeadProps) {
  const Icon = direction === null ? ChevronsUpDown : direction === "asc" ? ArrowUp : ArrowDown
  return (
    <TableHead
      className={isNumeric ? "text-right whitespace-nowrap" : "whitespace-nowrap"}
      aria-sort={direction === null ? "none" : direction === "asc" ? "ascending" : "descending"}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onSort}
      >
        {label}
        <Icon aria-hidden="true" />
      </Button>
    </TableHead>
  )
}

/** Clicking the active column flips the direction; a new one starts with `firstDirection`. */
export function nextSort<Key extends string>(
  current: { key: Key; direction: SortDirection },
  key: Key,
  firstDirection: SortDirection,
) {
  return current.key === key
    ? { key, direction: current.direction === "asc" ? ("desc" as const) : ("asc" as const) }
    : { key, direction: firstDirection }
}
