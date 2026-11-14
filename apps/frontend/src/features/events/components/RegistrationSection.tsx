import { useState } from "react"
import { Check, Copy, Lock } from "lucide-react"
import { toast } from "sonner"

import { FormError } from "@/components/FormError"
import { Notice } from "@/components/Notice"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CollapsibleSection } from "@/components/ui/collapsible-section"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { readApiError } from "@/lib/apiError"

import { type EventDetail } from "@/features/events/api/eventSchemas"
import { EventStatusBadge } from "@/features/events/components/EventStatusBadge"
import { OpeningConditions } from "@/features/events/components/OpeningReadiness"
import { useRefreshEvent } from "@/features/events/hooks/useEventMutations"
import { useOpenRegistration } from "@/features/events/hooks/useOpenRegistration"
import { publicRegistrationUrl } from "@/features/events/lib/publicLink"

type RegistrationSectionProps = {
  organizationId: string
  event: EventDetail
}

// Card "Přihlašování" of the event settings (S2-06): the
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
      toast.success("Odkaz byl zkopírován.")
      window.setTimeout(() => setIsCopied(false), 3000)
    } catch {
      setIsCopied(false)
      setHasCopyFailed(true)
    }
  }

  return (
    <CollapsibleSection
      headingId="registration-heading"
      title="Přihlašování"
    >
      <Card>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">Stav</span>
            <EventStatusBadge status={event.status} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="public-link">Veřejný odkaz na přihlášku</Label>
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
                variant="outline"
                onClick={handleCopy}
              >
                {isCopied ? <Check /> : <Copy />}
                {isCopied ? "Zkopírováno" : "Kopírovat"}
              </Button>
            </div>
            {isDraft ? (
              <p className="text-sm text-muted-foreground">
                Odkaz začne fungovat po otevření přihlašování.
              </p>
            ) : null}
            {hasCopyFailed ? (
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                Odkaz se nepodařilo zkopírovat. Označte ho výše a zkopírujte ručně.
              </p>
            ) : null}
          </div>

          {isDraft ? (
            <div className="space-y-4">
              <OpeningConditions
                organizationId={organizationId}
                event={event}
              />

              <Notice
                tone="warning"
                icon={Lock}
                title="Otevřením přihlašování zamknete název, popis, místo, termíny a ceny."
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
          ) : (
            <Notice
              tone="success"
              title="Přihlašování je otevřené"
            />
          )}
        </CardContent>
      </Card>
    </CollapsibleSection>
  )
}
