import logoUrl from "@/assets/akcio-logo.png"
import { cn } from "@/lib/utils"

// Decorative: the "akc.io" text next to it is the accessible name.
export function BrandMark({ isLarge = false }: { isLarge?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-[0.5em] font-sans font-medium tracking-normal whitespace-nowrap",
        isLarge ? "text-xl" : "text-sm",
      )}
    >
      <img
        src={logoUrl}
        alt=""
        width={36}
        height={36}
        className="size-[1.8em] shrink-0"
      />
      akc.io
    </span>
  )
}
