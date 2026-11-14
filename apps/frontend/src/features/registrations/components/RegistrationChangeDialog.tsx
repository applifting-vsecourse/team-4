import { useState } from "react"
import { RefreshCw } from "lucide-react"

import { FormError } from "@/components/FormError"
import { Notice } from "@/components/Notice"
import { PendingButton } from "@/components/PendingButton"
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

/**
 * The move gives up a confirmed place for a term the organizer has not
 * decided yet (S3-01); it needs the participant's explicit consent.
 */
export type ReleaseConsent = {
  /** The new terms, e.g. "Turnus 3". */
  targetTerm: string
  /** The confirmed terms the participant gives up, e.g. "Turnus 1, Turnus 2". */
  lostTerm: string
  /** Initial state of the consent checkbox. */
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
  release?: ReleaseConsent
  errorMessage?: string
  /** The registration changed meanwhile; the proposal must not overwrite it. */
  isStale?: boolean
  isSubmitting?: boolean
  onOpenChange?: (isOpen: boolean) => void
  /** Confirms the change; `isReleaseAccepted` is the state of the consent checkbox. */
  onConfirm?: (isReleaseAccepted: boolean) => void
  /** Loads the registration again after a stale proposal. */
  onReload?: () => void
}

// Moje přihlášky → Detail přihlášky → Úprava / odhlášení (F35-2a): the
// original and proposed registration before the participant confirms it.
// Either the change goes through directly or a request goes to the organizer.
// Design only: every value is passed in; the consent checkbox is the only state.
// The consent belongs to the release it was given for: when the server's
// preview changes the places given up, it has to be given again.
export function RegistrationChangeDialog({
  isOpen,
  isCancellation = false,
  summary,
  isApprovalRequired = false,
  isApprovalNewlyRequired = false,
  hasFinancialImpact = false,
  release,
  errorMessage,
  isStale = false,
  isSubmitting = false,
  onOpenChange,
  onConfirm,
  onReload,
}: RegistrationChangeDialogProps) {
  const releaseKey = release ? `${release.lostTerm}→${release.targetTerm}` : ""
  const [consent, setConsent] = useState({ key: releaseKey, isGiven: release?.isGiven ?? false })
  const isReleaseConsentGiven = consent.key === releaseKey && consent.isGiven
  const isRequest = isApprovalRequired || isApprovalNewlyRequired
  const confirmLabel = isRequest
    ? "Odeslat žádost o schválení"
    : isCancellation
      ? "Potvrdit odhlášení"
      : "Potvrdit změnu"

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isCancellation ? "Odhlášení" : "Kontrola změn přihlášky"}</DialogTitle>
          <DialogDescription className="sr-only">
            Původní a navržené údaje, dotčené termíny a změna ceny účasti a salda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isStale ? (
            <Notice
              tone="error"
              title="Přihláška se mezitím změnila. Načtěte ji znovu a změnu potvrďte."
            />
          ) : null}

          {errorMessage ? <FormError message={errorMessage} /> : null}

          {isApprovalNewlyRequired ? (
            <Notice
              tone="info"
              title="Mezitím začalo platit schvalování změn. Změnu můžete odeslat jen jako žádost."
            />
          ) : isApprovalRequired ? (
            <Notice
              tone="info"
              title="Změnu musí schválit organizátor. Do té doby platí současná přihláška."
            />
          ) : null}

          <ChangeSummary {...summary} />

          {hasFinancialImpact ? (
            <Notice
              tone="info"
              title="Storno poplatek a případnou vratku řeší organizátor podle podmínek akce."
            />
          ) : null}

          {release ? (
            <ReleaseNotice
              {...release}
              isGiven={isReleaseConsentGiven}
              onGivenChange={(isGiven) => setConsent({ key: releaseKey, isGiven })}
            />
          ) : null}
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
            <Button
              type="button"
              onClick={onReload}
            >
              <RefreshCw />
              Načíst přihlášku znovu
            </Button>
          ) : (
            <PendingButton
              type="button"
              variant={isCancellation && !isRequest ? "destructive" : "default"}
              isPending={isSubmitting}
              disabled={release ? !isReleaseConsentGiven : false}
              onClick={() => onConfirm?.(isReleaseConsentGiven)}
            >
              {confirmLabel}
            </PendingButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReleaseNotice({
  targetTerm,
  lostTerm,
  isGiven,
  onGivenChange,
}: ReleaseConsent & { onGivenChange: (isGiven: boolean) => void }) {
  return (
    <div className="space-y-3">
      <Notice
        tone="warning"
        title={`Přesunem přijdete o potvrzené místo v termínu ${lostTerm}. O účasti v termínu ${targetTerm} rozhodne organizátor.`}
      />
      <Field orientation="horizontal">
        <Checkbox
          id="release-consent"
          checked={isGiven}
          onCheckedChange={(checked) => onGivenChange(checked === true)}
        />
        <FieldLabel htmlFor="release-consent">
          Souhlasím, že přijdu o potvrzené místo v termínu {lostTerm}.
        </FieldLabel>
      </Field>
    </div>
  )
}
