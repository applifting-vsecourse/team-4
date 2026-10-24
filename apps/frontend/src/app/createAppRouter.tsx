import type { QueryClient } from "@tanstack/react-query"
import { createRouter, type RouterHistory } from "@tanstack/react-router"

import { AppLoadingScreen } from "@/components/AppLoadingScreen"
import { NotFound } from "@/components/Error/NotFound"
import { RootErrorBoundary } from "@/components/Error/RootErrorBoundary"
import { routeTree } from "@/routeTree.gen"

// The app's router configuration. The app uses the browser history; page
// previews pass a memory history, so they run the same routes and loaders.
export function createAppRouter({
  queryClient,
  history,
}: {
  queryClient: QueryClient
  history?: RouterHistory
}) {
  return createRouter({
    routeTree,
    history,
    context: { queryClient },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    defaultNotFoundComponent: NotFound,
    defaultErrorComponent: ({ error }) => <RootErrorBoundary error={error} />,
    defaultPendingComponent: AppLoadingScreen,
  })
}

export type AppRouter = ReturnType<typeof createAppRouter>
