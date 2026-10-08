import { QueryClient, type DefaultOptions } from "@tanstack/react-query"

const defaultQueryConfig = {
  queries: {
    // Refetching when the tab regains focus is how a feed stays fresh without
    // polling or websockets. It is TanStack's default; don't turn it off.
    refetchOnWindowFocus: true,
    // Fail fast and visibly in development rather than hiding errors behind retries.
    retry: 0,
  },
} satisfies DefaultOptions

export const queryClient = new QueryClient({
  defaultOptions: defaultQueryConfig,
})
