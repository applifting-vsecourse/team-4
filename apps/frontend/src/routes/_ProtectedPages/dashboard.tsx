import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

export const Route = createFileRoute("/_ProtectedPages/dashboard")({ component: DashboardPage })

function DashboardPage() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-12">
      <Seo title="Dashboard" />
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-3 text-muted-foreground">You’re signed in to akc.io.</p>
    </section>
  )
}
