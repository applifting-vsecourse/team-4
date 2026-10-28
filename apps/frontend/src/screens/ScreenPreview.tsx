import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router"

import { createAppRouter } from "@/app/createAppRouter"
import { queryClient as appQueryClient } from "@/config/react-query"

/**
 * One screen of the app: the real route tree, loaders and shell at `url`, with
 * a fresh query cache. Data comes from the story's MSW handlers.
 */
export function ScreenPreview({ url }: { url: string }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: appQueryClient.getDefaultOptions() }),
  )
  const [router] = useState(() =>
    createAppRouter({ queryClient, history: createMemoryHistory({ initialEntries: [url] }) }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
