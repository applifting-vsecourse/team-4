import type { ReactNode } from "react"
import { CircleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type FormErrorProps = {
  /** What failed, e.g. "Určení se nepodařilo uložit"; omit when the message says it. */
  title?: string
  /** The server's or the client's message, shown in full however long it is. */
  message?: string | null
  /** A way on that differs from submitting again, e.g. a retry that checks the lost response. */
  action?: ReactNode
}

// A failed save or action of a form or dialog. It sits at the form, above its
// buttons; success is a toast instead.
export function FormError({ title, message, action }: FormErrorProps) {
  return (
    <Alert variant="destructive">
      <CircleAlert aria-hidden />
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      {message || action ? (
        <AlertDescription>
          {message ? <p>{message}</p> : null}
          {action ? <div className="mt-1 flex flex-wrap gap-2">{action}</div> : null}
        </AlertDescription>
      ) : null}
    </Alert>
  )
}
