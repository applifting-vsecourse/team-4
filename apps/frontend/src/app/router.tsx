import { createRouter } from "@tanstack/react-router"

import { AppLoadingScreen } from "@/components/AppLoadingScreen"
import { NotFound } from "@/components/Error/NotFound"
import { RootErrorBoundary } from "@/components/Error/RootErrorBoundary"
import { queryClient } from "@/config/react-query"
import { routeTree } from "@/routeTree.gen"

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultNotFoundComponent: NotFound,
  defaultErrorComponent: ({ error }) => <RootErrorBoundary error={error} />,
  defaultPendingComponent: AppLoadingScreen,
})

declare module "@tanstack/react-router" {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Register {
    router: typeof router
  }
}
