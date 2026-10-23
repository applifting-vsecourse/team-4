import { useState } from "react"
import type { Decorator } from "@storybook/react-vite"
import { QueryClient, QueryClientProvider, type QueryKey } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { ThemeProvider as NextThemesProvider } from "next-themes"

import { TooltipProvider } from "@/components/ui/tooltip"

export type Theme = "light" | "dark"

/** Query results a story renders with, without any network: `[queryKey, data]` pairs. */
export type QueryData = [QueryKey, unknown][]

// A fresh client per story, so no story sees another's cache. `retry: false`
// turns a failed request into the error state at once.
export const withQueryClient: Decorator = (Story, context) => {
  const [client] = useState(() => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const queryData = (context.parameters.queryData ?? []) as QueryData
    for (const [queryKey, data] of queryData) queryClient.setQueryData(queryKey, data)
    return queryClient
  })
  return (
    <QueryClientProvider client={client}>
      <Story />
    </QueryClientProvider>
  )
}

// Same next-themes setup as the app (`.dark` on <html>), with the theme forced
// from the toolbar or the story's `globals.theme`.
export const withTheme: Decorator = (Story, context) => {
  const theme = (context.globals.theme ?? "light") as Theme
  return (
    <NextThemesProvider
      attribute="class"
      forcedTheme={theme}
      disableTransitionOnChange
    >
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    </NextThemesProvider>
  )
}

// A one-route router so <Link> and router hooks work. `parameters.route` sets
// the current URL.
export const withRouter: Decorator = (Story, context) => {
  const [router] = useState(() =>
    createRouter({
      routeTree: createRootRoute({ component: () => <Story /> }),
      history: createMemoryHistory({
        initialEntries: [(context.parameters.route ?? "/") as string],
      }),
    }),
  )
  return <RouterProvider router={router} />
}
