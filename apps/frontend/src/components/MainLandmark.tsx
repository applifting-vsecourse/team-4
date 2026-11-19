import { createContext, useContext, type ReactNode } from "react"

// A page has one <main>. Layouts that render a route outlet inside their own
// <main> say so here, so an error page shown in that outlet does not open a
// second, nested one (axe: landmark-main-is-top-level).
const WithinMainContext = createContext(false)

/** Content of a <main> rendered elsewhere, e.g. by `SidebarInset`. */
export function WithinMain({ children }: { children: ReactNode }) {
  return <WithinMainContext.Provider value>{children}</WithinMainContext.Provider>
}

/** The page's <main>; content inside knows it already has one. */
export function Main({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <main className={className}>
      <WithinMain>{children}</WithinMain>
    </main>
  )
}

/** Whether a <main> already surrounds this content. */
export function useWithinMain() {
  return useContext(WithinMainContext)
}
