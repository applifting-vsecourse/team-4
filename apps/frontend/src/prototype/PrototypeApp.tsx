import { useEffect, useRef, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router"
import { toast } from "sonner"

import { createAppRouter, type AppRouter } from "@/app/createAppRouter"
import { queryClient as appQueryClient } from "@/config/react-query"
import { setActiveSession } from "@/prototype/activeSession"
import { mockBackend } from "@/prototype/mockBackend/MockBackend"
import {
  loadScenario,
  type OrganizerPersona,
  type ParticipantPersona,
  type ScenarioName,
} from "@/prototype/mockBackend/scenarios"
import { PrototypeDock } from "@/prototype/PrototypeDock"

export type PrototypeAppProps = {
  /** The URL the app opens at. Changing it navigates there. */
  route: string
  /** The data the mock backend starts with. Changing it starts over. */
  scenario: ScenarioName
  /** The organizer signed in when the prototype opens. Changing it starts over. */
  organizer: OrganizerPersona
  /** The participant with a verified magic-link session. Changing it starts over. */
  participant: ParticipantPersona
  /** Delay of every API answer in ms, to see the loading states. */
  latency: number
  /** Every API request fails with 500, to see each screen's error state. */
  isServerDown: boolean
  /** The prototype controls: address bar, jump links and the mailbox. */
  hasToolbar: boolean
}

/**
 * The whole app (its route tree, loaders and pages) on the in-memory mock
 * backend: every page story is the real page, and its links lead on to the
 * others. Install `mockBackendHandlers` with `parameters.msw`.
 */
export function PrototypeApp(props: PrototypeAppProps) {
  const { latency, isServerDown, scenario, organizer, participant } = props

  // A session sets the network up when it starts (before the router's first
  // request); this keeps it in step with later edits in Storybook's controls.
  useEffect(() => {
    mockBackend.configure({ latency, isServerDown })
  }, [latency, isServerDown])

  return (
    <PrototypeSession
      key={`${scenario}:${organizer}:${participant}`}
      {...props}
    />
  )
}

// One visit, as in a fresh private window: new backend data, query cache,
// router history and browser storage.
function PrototypeSession({
  route,
  scenario,
  organizer,
  participant,
  latency,
  isServerDown,
  hasToolbar,
}: PrototypeAppProps) {
  const [queryClient] = useState(() => {
    loadScenario(mockBackend, scenario, { organizer, participant })
    mockBackend.configure({ latency, isServerDown })
    clearAppStorage()
    // sonner replays undismissed toasts to every new Toaster, and the previous
    // visit's Toaster is gone with the timers that would have dismissed them.
    toast.dismiss()
    return new QueryClient({ defaultOptions: appQueryClient.getDefaultOptions() })
  })
  const [router] = useState(() =>
    createAppRouter({ queryClient, history: createMemoryHistory({ initialEntries: [route] }) }),
  )

  useEffect(() => {
    setActiveSession({ router, queryClient })
    return () => setActiveSession(null)
  }, [router, queryClient])
  useNavigateOnRouteChange(router, route)
  useInAppAnchors(router)

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {hasToolbar ? <PrototypeDock router={router} /> : null}
    </QueryClientProvider>
  )
}

/** Editing the `route` arg in Storybook's controls navigates without starting over. */
function useNavigateOnRouteChange(router: AppRouter, route: string) {
  const isFirst = useRef(true)
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      return
    }
    router.history.push(route)
  }, [router, route])
}

/**
 * A few pages link with a plain `<a href>` (e.g. "Moje přihlášky" after
 * registering). In the app that is a page load; here it would navigate
 * Storybook's iframe away, so the prototype's router follows it instead.
 * Router links have already prevented the default by the time it bubbles here.
 */
function useInAppAnchors(router: AppRouter) {
  useEffect(() => {
    const follow = (event: MouseEvent) => {
      const hasModifier = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
      if (event.defaultPrevented || event.button !== 0 || hasModifier) return
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank") return
      const url = new URL(anchor.href)
      if (url.origin !== window.location.origin || anchor.getAttribute("href")?.startsWith("#")) {
        return
      }
      event.preventDefault()
      router.history.push(`${url.pathname}${url.search}${url.hash}`)
    }
    document.addEventListener("click", follow)
    return () => document.removeEventListener("click", follow)
  }, [router])
}

/** What the app keeps in the browser (last used organization), so visits don't leak. */
function clearAppStorage() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("akcio:")) localStorage.removeItem(key)
    }
  } catch {
    // Storage can be blocked; the app copes without it.
  }
}
