import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

import { useTheme } from "@/hooks/useTheme"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          // Rich colours from the status tokens, the pairs of the status badges,
          // which pass WCAG AA in both themes; Sonner's own greens do not (#400).
          "--success-bg": "var(--success-subtle)",
          "--success-text": "var(--success)",
          "--success-border": "var(--success)",
          "--warning-bg": "var(--warning-subtle)",
          "--warning-text": "var(--warning)",
          "--warning-border": "var(--warning)",
          "--error-bg": "var(--destructive-subtle)",
          "--error-text": "var(--destructive-subtle-foreground)",
          "--error-border": "var(--destructive-subtle-foreground)",
          // No information colour: the neutral surface.
          "--info-bg": "var(--popover)",
          "--info-text": "var(--popover-foreground)",
          "--info-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
