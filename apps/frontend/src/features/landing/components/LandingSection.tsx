import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type LandingSectionProps = {
  children: ReactNode
  labelledBy: string
  isMuted?: boolean
}

// Full-width band with the page's content column (1 120 px max, as in the wireframe).
export function LandingSection({ children, labelledBy, isMuted = false }: LandingSectionProps) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={cn("py-12 md:py-24", isMuted && "bg-muted")}
    >
      <div className="mx-auto flex w-full max-w-280 flex-col gap-6 px-4 md:gap-10 md:px-8">
        {children}
      </div>
    </section>
  )
}
