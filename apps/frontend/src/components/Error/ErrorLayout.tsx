import type { ReactNode } from "react"

type ErrorLayoutProps = {
  title: string
  description?: ReactNode
  action?: ReactNode
}

export function ErrorLayout({ title, description, action }: ErrorLayoutProps) {
  return (
    <main className="grid min-h-svh place-content-center px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {description ? <p className="mt-3 text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </main>
  )
}
