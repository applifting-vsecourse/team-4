import { useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronRight } from "lucide-react"

/** A horizontally scrollable row with a right-edge cue while more items remain. */
export function HorizontalOverflowViewport({ children }: { children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [shouldShowRightCue, setShouldShowRightCue] = useState(false)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const updateCue = () => {
      const hasMoreContent = viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 1
      setShouldShowRightCue(viewport.scrollWidth > viewport.clientWidth + 1 && hasMoreContent)
    }

    updateCue()
    viewport.addEventListener("scroll", updateCue, { passive: true })
    const observer = new ResizeObserver(updateCue)
    observer.observe(viewport)
    if (viewport.firstElementChild instanceof HTMLElement) {
      observer.observe(viewport.firstElementChild)
    }

    return () => {
      viewport.removeEventListener("scroll", updateCue)
      observer.disconnect()
    }
  }, [])

  return (
    <div className="relative -mr-4 min-w-0 md:mr-0">
      <div
        ref={viewportRef}
        className="w-full overflow-x-auto pb-1"
      >
        {children}
      </div>
      {shouldShowRightCue ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-9 items-center justify-end bg-gradient-to-l from-background via-background/90 to-transparent pr-1 text-muted-foreground md:hidden"
        >
          <ChevronRight className="size-4" />
        </div>
      ) : null}
    </div>
  )
}
