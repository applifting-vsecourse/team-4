import {
  forwardRef,
  useState,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactElement,
} from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/** A consistent, nonessential hint for an icon-only control. */
type ActionTooltipProps = Omit<
  ComponentPropsWithoutRef<typeof TooltipTrigger>,
  "asChild" | "children"
> & {
  label: string
  children: ReactElement
}

export const ActionTooltip = forwardRef<ElementRef<typeof TooltipTrigger>, ActionTooltipProps>(
  function ActionTooltip({ label, children, ...triggerProps }, ref) {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <Tooltip
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <TooltipTrigger
          {...triggerProps}
          ref={ref}
          asChild
          onClick={(event) => {
            triggerProps.onClick?.(event)
            setIsOpen(false)
          }}
        >
          {children}
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    )
  },
)
