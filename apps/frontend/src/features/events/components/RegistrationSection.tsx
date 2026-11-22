import { useState } from "react"
import { Check, Copy, ExternalLink, Lock } from "lucide-react"
import { toast } from "sonner"

import { FormError } from "@/components/FormError"
import { Notice } from "@/components/Notice"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { readApiError } from "@/lib/apiError"

import { type EventDetail } from "@/features/events/api/eventSchemas"
import { OpeningConditions } from "@/features/events/components/OpeningReadiness"
import { useRefreshEvent } from "@/features/events/hooks/useEventMutations"
import { useOpenRegistration } from "@/features/events/hooks/useOpenRegistration"
import { publicRegistrationUrl } from "@/features/events/lib/publicLink"

type RegistrationSectionProps = {
  organizationId: string
  event: EventDetail
}

// Subsection "Přihlašování" of public event access (S2-06): the
// state, the permanent public link and the one-way opening. Closing and
// reopening are deferred by the PM.
export function RegistrationSection({ organizationId, event }: RegistrationSectionProps) {
  const open = useOpenRegistration(organizationId, event.id)
  const refreshEvent = useRefreshEvent(organizationId, event.id)
  const [openError, setOpenError] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [hasCopyFailed, setHasCopyFailed] = useState(false)

  const link = publicRegistrationUrl(event.publicId)
  const isDraft = event.status === "draft"
  const canOpen = isDraft && event.openingBlockers.length === 0

  const handleOpen = async () => {
    setOpenError(null)
    try {
      await open.mutateAsync()
    } catch (error) {
      const apiError = readApiError(error)
      // The server has the last word: show what it found missing now.
      if (apiError.status === 404 || apiError.status === 409) await refreshEvent()
      setOpenError(
        apiError.code === "opening_conditions_not_met"
          ? "Přihlašování nelze otevřít, doplňte chybějící údaje."
          : apiError.status === 404
            ? "Záznam není dostupný."
            : "Přihlašování se nepodařilo otevřít. Zkuste to prosím znovu.",
      )
    }
  }

  // "Zkopírováno" appears only after the browser confirmed the copy.
  const handleCopy = async () => {
    setHasCopyFailed(false)
    try {
      await navigator.clipboard.writeText(link)
      setIsCopied(true)
      toast.success("Odkaz na přihlášku byl zkopírován.")
      window.setTimeout(() => setIsCopied(false), 3000)
    } catch {
      setIsCopied(false)
      setHasCopyFailed(true)
    }
  }

  return (
    <section
      aria-labelledby="registration-heading"
      className="space-y-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3
          id="registration-heading"
          className="text-h4"
        >
          Přihlašování
        </h3>
        <Badge variant={event.status === "open" ? "success" : "secondary"}>
          {event.status === "open" ? "Otevřeno" : "Uzavřeno"}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Odkaz pro účastníky, kteří se chtějí přihlásit na akci.
      </p>
      <div className="space-y-4">
        <Field>
          <FieldLabel htmlFor="public-link">Odkaz na přihlášku</FieldLabel>
          <div className="flex flex-wrap gap-2">
            <Input
              id="public-link"
              className="min-w-0 flex-1 basis-60"
              readOnly
              value={link}
              onFocus={(inputEvent) => inputEvent.currentTarget.select()}
            />
            <Button
              type="button"
              onClick={handleCopy}
            >
              {isCopied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {isCopied ? "Zkopírováno" : "Kopírovat přihlášku"}
            </Button>
            {event.status === "open" ? (
              <Button
                asChild
                variant="secondary"
              >
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink aria-hidden />
                  Otevřít
                </a>
              </Button>
            ) : null}
          </div>
          {isDraft ? (
            <FieldDescription>Odkaz začne fungovat po otevření přihlašování.</FieldDescription>
          ) : null}
          {hasCopyFailed ? (
            <p
              role="alert"
              className="text-sm text-destructive"
            >
              Odkaz se nepodařilo zkopírovat. Označte ho výše a zkopírujte ručně.
            </p>
          ) : null}
        </Field>

        {isDraft ? (
          <div className="space-y-4">
            <OpeningConditions
              organizationId={organizationId}
              event={event}
            />

            <Notice
              tone="warning"
              icon={Lock}
              title="Otevřením přihlašování zamknete název, místo, termíny a ceny. Popis akce zůstane upravitelný ve Veřejné prezentaci."
            />

            {openError ? <FormError message={openError} /> : null}

            <div className="flex justify-end">
              <Button
                type="button"
                disabled={!canOpen || open.isPending}
                onClick={handleOpen}
              >
                Otevřít přihlašování
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
