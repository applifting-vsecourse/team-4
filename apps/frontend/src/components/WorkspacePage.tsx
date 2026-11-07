import type { ReactNode } from "react"

/**
 * The content of one page of the organization's workspace (beside the
 * sidebar): one width and the same side margins on every page, so moving
 * between Přehled, Přihlášky, Ubytování and the rest never shifts the content.
 * A narrower form sits inside, aligned to the same left edge.
 */
export function WorkspacePage({ children }: { children: ReactNode }) {
  return <section className="mx-auto w-full max-w-5xl px-4 py-8 md:py-12">{children}</section>
}
