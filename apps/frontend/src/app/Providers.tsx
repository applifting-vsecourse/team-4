import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"

import { router } from "@/app/router"
import { queryClient } from "@/config/react-query"
import { ThemeProvider } from "@/hooks/useTheme"

export function Providers() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
