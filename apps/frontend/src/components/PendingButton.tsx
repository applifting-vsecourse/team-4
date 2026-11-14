import type { ComponentProps, ReactNode } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"

type PendingButtonProps = ComponentProps<typeof Button> & {
  /** While the action it started runs: disabled, with a spinner before the label. */
  isPending: boolean
  /** Icon shown when not pending; the spinner takes its place. */
  icon?: ReactNode
}

// A button whose action takes a while, e.g. a form submit or a dialog's confirm.
export function PendingButton({ isPending, icon, children, ...props }: PendingButtonProps) {
  return (
    <Button
      {...props}
      disabled={isPending || props.disabled}
    >
      {isPending ? (
        <Loader2
          aria-hidden
          className="animate-spin"
        />
      ) : (
        icon
      )}
      {children}
    </Button>
  )
}
