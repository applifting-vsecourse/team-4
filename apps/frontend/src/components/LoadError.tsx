import type { ReactNode } from "react"
import { CircleAlert } from "lucide-react"

import { Notice } from "@/components/Notice"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { formatPragueDateTime } from "@/lib/date"

type LoadErrorProps = {
  /** E.g. "Program se nepodařilo načíst"; the default fits any data. */
  title?: string
  description?: string
  /** When the data still shown were last read; absent when nothing was ever loaded. */
  shownFrom?: number
  onRetry?: () => unknown
  isRetrying?: boolean
  /** "page" replaces the whole content; "inline" sits in a section. */
  variant?: "inline" | "page"
  /** A way out next to the retry, e.g. a link back to the catalog. */
  action?: ReactNode
}

// A failed load or refresh, never shown as empty data. Data that are still
// shown are said to be old.
export function LoadError({
  title = "Data se nepodařilo načíst",
  description,
  shownFrom,
  onRetry,
  isRetrying = false,
  variant = "inline",
  action,
}: LoadErrorProps) {
  const retry = onRetry ? (
    <Button
      type="button"
      variant="outline"
      size={variant === "inline" ? "sm" : "default"}
      disabled={isRetrying}
      onClick={() => onRetry()}
    >
      Zkusit znovu
    </Button>
  ) : null

  if (variant === "page") {
    return (
      <Empty role="alert">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CircleAlert />
          </EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          {description ? <EmptyDescription>{description}</EmptyDescription> : null}
        </EmptyHeader>
        <EmptyContent>
          <div className="flex flex-wrap justify-center gap-2">
            {retry}
            {action}
          </div>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <Notice
      tone="error"
      title={title}
    >
      {description ? <p>{description}</p> : null}
      {shownFrom ? (
        <p>
          Zobrazené údaje jsou z posledního úspěšného načtení (
          {formatPragueDateTime(new Date(shownFrom).toISOString())}).
        </p>
      ) : null}
      {retry || action ? (
        <div className="mt-1 flex flex-wrap gap-2">
          {retry}
          {action}
        </div>
      ) : null}
    </Notice>
  )
}
