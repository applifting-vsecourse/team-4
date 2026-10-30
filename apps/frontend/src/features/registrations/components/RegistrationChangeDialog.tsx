import { Info, Loader2, RefreshCw, TriangleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"

import {
  ChangeSummary,
  type ChangeSummaryProps,
} from "@/features/registrations/components/ChangeSummary"

/** The move ends on the waitlist; it needs the participant's explicit consent. */
export type WaitlistConsent = {
  /** The full target term, e.g. "Turnus 3". */
  targetTerm: string
  /** The confirmed term the participant gives up, e.g. "Turnus 2". */
  lostTerm: string
  /** The capacity was re-checked on execution and the result changed. */
  hasResultChanged?: boolean
  isGiven?: boolean
}

export type RegistrationChangeDialogProps = {
  isOpen: boolean
  /** Cancelling terms or the whole registration rather than editing it. */
  isCancellation?: boolean
  summary: ChangeSummaryProps
  /** A term in the change lies within the organizer's approval threshold. */
  isApprovalRequired?: boolean
  /** The threshold was reached after the form was opened; checked on submit. */
  isApprovalNewlyRequired?: boolean
  /** Terms or payments are affected, so the financial settlement is mentioned. */
  hasFinancialImpact?: boolean
  waitlist?: WaitlistConsent
  errorMessage?: string
  /** The registration changed meanwhile; the proposal must not overwrite it. */
  isStale?: boolean
  isSubmitting?: boolean
}

// Moje přihlášky → Detail přihlášky → Úprava / odhlášení (F35-2a): the
// original and proposed registration before the participant confirms it.
// Either the change goes through directly or a request goes to the organizer.
// Design only: every value is passed in; the consent checkbox is the only state.
export function RegistrationChangeDialog({
  isOpen,
  isCancellation = false,
  summary,
  isApprovalRequired = false,
  isApprovalNewlyRequired = false,
  hasFinancialImpact = false,
  waitlist,
  errorMessage,
  isStale = false,
  isSubmitting = false,
}: RegistrationChangeDialogProps) {
  const isRequest = isApprovalRequired || isApprovalNewlyRequired
  const confirmLabel = isRequest
    ? "Odeslat žádost o schválení"
    : isCancellation
      ? "Potvrdit odhlášení"
      : "Potvrdit změnu"

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isCancellation ? "Odhlášení" : "Kontrola změn přihlášky"}</DialogTitle>
          <DialogDescription className="sr-only">
            Původní a navržené údaje, dotčené termíny a změna ceny účasti a salda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isStale ? (
            <Alert variant="destructive">
              <RefreshCw />
              <AlertTitle>
                Přihláška se mezitím změnila. Načtěte ji znovu a změnu potvrďte.
              </AlertTitle>
            </Alert>
          ) : null}

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          {isApprovalNewlyRequired ? (
            <Alert>
              <Info />
              <AlertTitle>
                Mezitím začalo platit schvalování změn. Změnu můžete odeslat jen jako žádost.
              </AlertTitle>
            </Alert>
          ) : isApprovalRequired ? (
            <Alert>
              <Info />
              <AlertTitle>
                Změnu musí schválit organizátor. Do té doby platí současná přihláška.
              </AlertTitle>
            </Alert>
          ) : null}

          <ChangeSummary {...summary} />

          {hasFinancialImpact ? (
            <Alert>
              <Info />
              <AlertTitle>
                Storno poplatek a případnou vratku řeší organizátor podle podmínek akce.
              </AlertTitle>
            </Alert>
          ) : null}

          {waitlist ? <WaitlistNotice {...waitlist} /> : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
            >
              Zpět k úpravám
            </Button>
          </DialogClose>
          {isStale ? (
            <Button type="button">
              <RefreshCw />
              Načíst přihlášku znovu
            </Button>
          ) : (
            <Button
              type="button"
              variant={isCancellation && !isRequest ? "destructive" : "default"}
              disabled={isSubmitting || (waitlist ? !waitlist.isGiven : false)}
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {confirmLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function WaitlistNotice({ targetTerm, lostTerm, hasResultChanged, isGiven }: WaitlistConsent) {
  return (
    <div className="space-y-3">
      <Alert>
        <TriangleAlert />
        <AlertTitle>
          {hasResultChanged
            ? `${targetTerm} se mezitím zaplnil. Místo v termínu ${lostTerm} vám zatím zůstává.`
            : `${targetTerm} je plně obsazený. Přesunem přijdete o potvrzené místo v termínu ${lostTerm}.`}
        </AlertTitle>
      </Alert>
      <Field orientation="horizontal">
        <Checkbox
          id="waitlist-consent"
          defaultChecked={isGiven}
        />
        <FieldLabel htmlFor="waitlist-consent">
          Souhlasím, že v termínu {targetTerm} budu náhradník.
        </FieldLabel>
      </Field>
    </div>
  )
}
