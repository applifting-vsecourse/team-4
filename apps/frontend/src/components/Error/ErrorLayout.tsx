import type { ReactNode } from "react"

import { useWithinMain } from "@/components/MainLandmark"

type ErrorLayoutProps = {
  title: string
  description?: ReactNode
  action?: ReactNode
}

export function ErrorLayout({ title, description, action }: ErrorLayoutProps) {
  // Inside a layout's <main> the error page is its content; on its own it is the page's <main>.
  const Landmark = useWithinMain() ? "div" : "main"
  return (
    <Landmark className="grid min-h-svh place-content-center px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {description ? <p className="mt-3 text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </Landmark>
  )
}
