import { CircleAlert } from "lucide-react"

import { Alert, AlertTitle } from "@/components/ui/alert"

export type ErrorAlertProps = {
  /** Short enough for one line in a dialog: the kit clamps alert titles. */
  title: string
  /** The rest of the message, shown in full however long it is. */
  detail?: string
}

// A refused or failed action with its whole message, for the accommodation
// evaluation. The detail sits below the alert: inside a destructive alert the
// kit's description colour does not reach AA contrast. The wrapper is the live
// region, so a screen reader announces the title together with the detail.
export function ErrorAlert({ title, detail }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className="space-y-2"
    >
      <Alert
        variant="destructive"
        role="none"
      >
        <CircleAlert />
        <AlertTitle>{title}</AlertTitle>
      </Alert>
      {detail ? <p className="text-sm">{detail}</p> : null}
    </div>
  )
}
