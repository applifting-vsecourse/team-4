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
  afterContent?: ReactNode
}

export function CollapsibleSection({
  headingId,
  title,
  children,
  afterContent,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const router = useRouter({ warn: false })

  useEffect(
    () =>
      router?.subscribe("onBeforeLoad", ({ toLocation }) => {
        if (toLocation.hash === headingId) setIsOpen(true)
      }),
    [router, headingId],
  )

  return (
    <Collapsible
      asChild
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <section aria-labelledby={headingId}>
        <h2
          id={headingId}
          className="-ms-2.5 text-h4"
        >
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="group h-auto min-h-9 w-full"
            >
              <span className="flex w-full items-center justify-between gap-2 px-2.5">
                <span className="text-left text-h4 font-extrabold whitespace-normal">{title}</span>
                <ChevronDown
                  aria-hidden
                  className="group-data-[state=open]:rotate-180 motion-safe:transition-transform motion-safe:duration-200"
                />
              </span>
            </Button>
          </CollapsibleTrigger>
        </h2>
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
