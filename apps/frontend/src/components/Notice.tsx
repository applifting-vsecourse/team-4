import type { ReactNode } from "react"
import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export type NoticeTone = "info" | "success" | "warning" | "error"

const TONES: Record<
  NoticeTone,
  { icon: LucideIcon; variant: "default" | "success" | "warning" | "destructive" }
> = {
  info: { icon: Info, variant: "default" },
  success: { icon: CircleCheck, variant: "success" },
  warning: { icon: TriangleAlert, variant: "warning" },
  error: { icon: CircleAlert, variant: "destructive" },
}

type NoticeProps = {
  tone: NoticeTone
  /** The message itself; a one-sentence notice is a title only. */
  title: ReactNode
  /** The rest of the message and any action that belongs to it. */
  children?: ReactNode
  /** Only for a meaning beyond the tone, e.g. Lock for a locked event. */
  icon?: LucideIcon
  /** Live-region role, "alert" by default as in the kit. */
  role?: "alert" | "status"
}

// Every in-page message: the tone picks the icon and colour, the title is
// always present, details and actions sit in the description.
export function Notice({ tone, title, children, icon, role = "alert" }: NoticeProps) {
  const { icon: toneIcon, variant } = TONES[tone]
  const Icon = icon ?? toneIcon

  return (
    <Alert
      variant={variant}
      role={role}
    >
      <Icon aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      {children ? <AlertDescription>{children}</AlertDescription> : null}
    </Alert>
  )
}
