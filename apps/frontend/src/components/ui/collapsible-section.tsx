import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "@tanstack/react-router"
import { ChevronDown } from "lucide-react"

import "./collapsible-section.css"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

type CollapsibleSectionProps = {
  headingId: string
  title: string
  children: ReactNode
  actions?: ReactNode
  afterContent?: ReactNode
}

const storageKey = (pathname: string, headingId: string) =>
  `akcio:collapsible-section:${pathname}:${headingId}`

function readOpenState(key: string) {
  if (typeof window === "undefined") return true

  try {
    const savedState = window.localStorage.getItem(key)
    return savedState === null || savedState === "open"
  } catch {
    return true
  }
}

function saveOpenState(key: string, isOpen: boolean) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(key, isOpen ? "open" : "closed")
  } catch {
    // Collapsing sections still works if browser storage is unavailable.
  }
}

export function CollapsibleSection({
  headingId,
  title,
  children,
  actions,
  afterContent,
}: CollapsibleSectionProps) {
  const router = useRouter({ warn: false })
  const pathname = typeof window === "undefined" ? "/" : window.location.pathname
  const sectionStorageKey = storageKey(pathname, headingId)
  const [isOpen, setIsOpen] = useState(() => readOpenState(sectionStorageKey))

  useEffect(() => {
    const isAnchorTarget = router?.state.location.hash === headingId
    setIsOpen(isAnchorTarget || readOpenState(sectionStorageKey))
  }, [headingId, router, sectionStorageKey])

  useEffect(
    () =>
      router?.subscribe("onBeforeLoad", ({ toLocation }) => {
        if (toLocation.hash === headingId) setIsOpen(true)
      }),
    [router, headingId],
  )

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    saveOpenState(sectionStorageKey, open)
  }

  return (
    <Collapsible
      asChild
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <section aria-labelledby={headingId}>
        <div className="flex min-h-9 flex-wrap items-center justify-between gap-4">
          <h2
            id={headingId}
            className="min-w-0 flex-1 text-h4"
          >
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="group h-auto min-h-9 w-full"
              >
                <span className="flex w-full items-center justify-between gap-2 px-2.5">
                  <span className="text-left text-h4 font-extrabold whitespace-normal">
                    {title}
                  </span>
                  <ChevronDown
                    aria-hidden
                    className="group-data-[state=open]:rotate-180 motion-safe:transition-transform motion-safe:duration-200"
                  />
                </span>
              </Button>
            </CollapsibleTrigger>
          </h2>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        <CollapsibleContent
          forceMount
          data-collapsible-section-content=""
          inert={!isOpen}
        >
          <div className="min-h-0">
            <div className="pt-4">{children}</div>
          </div>
        </CollapsibleContent>
        {afterContent}
      </section>
    </Collapsible>
  )
}
