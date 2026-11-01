import type { ReactNode } from "react"
import { BedDouble, ClipboardList, WalletCards } from "lucide-react"

import { cn } from "@/lib/utils"

type IllustratedSectionProps = {
  heading: string
  headingId: string
  imageAlt: string
  isImageOnLeft?: boolean
  imageSize?: "large" | "regular"
  imageSrc: string
  surface?: "default" | "muted"
  children?: ReactNode
}

function IllustratedSection({
  heading,
  headingId,
  imageAlt,
  isImageOnLeft = false,
  imageSize = "large",
  imageSrc,
  surface = "default",
  children,
}: IllustratedSectionProps) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn("py-12 md:py-20", surface === "muted" && "bg-muted")}
    >
      <div className="mx-auto grid w-full max-w-280 items-center gap-8 px-4 md:grid-cols-2 md:gap-12 md:px-8">
        <div className={cn("order-1 flex flex-col gap-5", isImageOnLeft && "md:order-2")}>
          <h2
            id={headingId}
            className="text-4xl font-semibold tracking-tight text-balance md:text-5xl"
          >
            {heading}
          </h2>
          {children}
        </div>
        <img
          src={imageSrc}
          alt={imageAlt}
          loading="lazy"
          decoding="async"
          className={cn(
            "order-2 h-auto w-full object-contain",
            imageSize === "large" ? "max-h-96" : "max-h-80",
            isImageOnLeft && "md:order-1",
          )}
        />
      </div>
    </section>
  )
}

const TOOLKIT_FEATURES = [
  {
    icon: ClipboardList,
    title: "Přihlášky a účastníci",
    description: "Mějte přehled o přihlášených, potvrzených účastnících i náhradnících.",
  },
  {
    icon: BedDouble,
    title: "Ubytování a kapacity",
    description: "Sledujte obsazenost pokojů a dostupná místa.",
  },
  {
    icon: WalletCards,
    title: "Platby a přehled stavu",
    description: "Na jednom místě vidíte, kdo zaplatil a co zbývá vyřešit.",
  },
]

export function IllustratedLandingSections() {
  return (
    <>
      <IllustratedSection
        headingId="akce-bez-chaosu"
        heading="Méně tabulek. Více času na akci."
        imageSrc="/images/landing/chaos-to-control.png"
        imageAlt="Ilustrace ukazující přechod od chaosu k organizované správě akce"
      >
        <p className="text-lg leading-relaxed text-muted-foreground">
          Přihlášky, platby, ubytování i další agenda přehledně na jednom místě. Místo tabulek,
          e-mailů a ručního přepisování máte vše pod kontrolou.
        </p>
      </IllustratedSection>

      <IllustratedSection
        headingId="typy-akci"
        heading="Jedna platforma pro různé typy akcí"
        imageSrc="/images/landing/event-types.png"
        imageAlt="Ilustrace různých typů akcí, které lze organizovat v akc.io"
        isImageOnLeft
        surface="muted"
      >
        <p className="text-lg leading-relaxed text-muted-foreground">
          Od letních táborů přes sportovní soustředění až po workshopy nebo firemní výjezdy. Akc.io
          se přizpůsobí tomu, co pořádáte.
        </p>
      </IllustratedSection>

      <IllustratedSection
        headingId="vse-pod-kontrolou"
        heading="Vše důležité pod kontrolou"
        imageSrc="/images/landing/core-toolkit.png"
        imageAlt="Ilustrace správy přihlášek, ubytování a plateb v akc.io"
        imageSize="regular"
      >
        <p className="text-lg leading-relaxed text-muted-foreground">
          Spravujte účastníky, kapacity pokojů i platby v jednom systému. Organizátor vidí, co je
          potvrzené, co zbývá doplnit a co už je vyřešeno.
        </p>
        <ul className="flex flex-col gap-4 pt-1">
          {TOOLKIT_FEATURES.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className="flex items-start gap-3"
            >
              <span className="mt-0.5 rounded-md border-2 border-foreground bg-primary p-2 text-primary-foreground">
                <Icon
                  aria-hidden
                  className="size-5"
                />
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </IllustratedSection>
    </>
  )
}
