import type { ReactNode } from "react"
import { BedDouble, ClipboardList, WalletCards } from "lucide-react"

import { cn } from "@/lib/utils"

import chaosToControlImage from "@/features/landing/images/chaos-to-control.webp"
import coreToolkitImage from "@/features/landing/images/core-toolkit.webp"
import eventTypesImage from "@/features/landing/images/event-types.webp"

type IllustratedSectionProps = {
  heading: string
  headingId: string
  imageAlt: string
  imageSrc: string
  isImageOnLeft?: boolean
  isImageRegular?: boolean
  isMuted?: boolean
  children?: ReactNode
}

function IllustratedSection({
  heading,
  headingId,
  imageAlt,
  imageSrc,
  isImageOnLeft = false,
  isImageRegular = false,
  isMuted = false,
  children,
}: IllustratedSectionProps) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn("py-12 md:py-20", isMuted && "bg-muted")}
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
            // The paper-coloured illustrations are dimmed in the dark so they don't glare.
            "order-2 h-auto w-full object-contain dark:brightness-90",
            isImageRegular ? "max-h-80" : "max-h-96",
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

/** Three illustrated sections between the hero and the audiences (S3-T2 "Ticket stub"). */
export function IllustratedSections() {
  return (
    <>
      <IllustratedSection
        headingId="mene-tabulek"
        heading="Méně tabulek. Více času na akci."
        imageSrc={chaosToControlImage}
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
        imageSrc={eventTypesImage}
        imageAlt="Ilustrace různých typů akcí, které lze organizovat v akc.io"
        isImageOnLeft
        isMuted
      >
        <p className="text-lg leading-relaxed text-muted-foreground">
          Od letních táborů přes sportovní soustředění až po workshopy nebo firemní výjezdy. akc.io
          se přizpůsobí tomu, co pořádáte.
        </p>
      </IllustratedSection>

      <IllustratedSection
        headingId="vse-pod-kontrolou"
        heading="Vše důležité pod kontrolou"
        imageSrc={coreToolkitImage}
        imageAlt="Ilustrace správy přihlášek, ubytování a plateb v akc.io"
        isImageRegular
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
              <span className="mt-0.5 rounded-md border-2 border-primary-foreground bg-primary p-2 text-primary-foreground">
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
