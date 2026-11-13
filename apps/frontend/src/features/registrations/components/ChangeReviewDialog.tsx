import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { FormError } from "@/components/FormError"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import {
  type ChangePreview,
  type ChangeProposal,
  type RegistrationChange,
} from "@/features/registrations/api/registrationChangeSchemas"
import {
  RegistrationChangeDialog,
  type ReleaseConsent,
} from "@/features/registrations/components/RegistrationChangeDialog"
import {
  usePreviewChange,
  useSubmitChange,
} from "@/features/registrations/hooks/useRegistrationChange"
import { describeChangeError, type ChangeError } from "@/features/registrations/lib/changeErrors"
import { toSummaryProps } from "@/features/registrations/lib/changeSummary"

type ChangeReviewDialogProps = {
  registrationId: string
  proposal: ChangeProposal
  /** The review is closed without sending anything. */
  onClose: () => void
  /** The change was made or the request was filed. */
  onDone: (result: { outcome: "applied" | "requested"; change: RegistrationChange }) => void
  /** The registration changed meanwhile and must be loaded again. */
  onReload: () => void
}

const PREVIEW_FAILED = "Kontrolu změn se nepodařilo načíst. Zkuste to prosím znovu."

// The review before a change is made (F35-2a): the server works out the
// original and proposed registration, the participant confirms it, and the
// server checks the capacity and the approval threshold again on submit. A
// result that differs from what was confirmed is shown for a new confirmation;
// nothing is reported as success until the server has saved it.
export function ChangeReviewDialog({
  registrationId,
  proposal,
  onClose,
  onDone,
  onReload,
}: ChangeReviewDialogProps) {
  const previewChange = usePreviewChange(registrationId)
  const submitChange = useSubmitChange(registrationId)
  const [preview, setPreview] = useState<ChangePreview | null>(null)
  const [error, setError] = useState<ChangeError | null>(null)
  const [isStale, setIsStale] = useState(false)
  const [isApprovalNewlyRequired, setIsApprovalNewlyRequired] = useState(false)

  const { mutate: requestPreview } = previewChange
  useEffect(() => {
    requestPreview(proposal, { onSuccess: setPreview })
  }, [requestPreview, proposal])

  if (!preview) {
    return (
      <Dialog
        open
        onOpenChange={(isOpen) => (isOpen ? undefined : onClose())}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Kontrola změn přihlášky</DialogTitle>
            <DialogDescription className="sr-only">
              Původní a navržené údaje, dotčené termíny a změna ceny účasti a salda.
            </DialogDescription>
          </DialogHeader>
          {previewChange.isError ? (
            <FormError message={PREVIEW_FAILED} />
          ) : (
            <p
              role="status"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Loader2 className="size-4 animate-spin" />
              Načítám kontrolu změn…
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Zpět k úpravám</Button>
            </DialogClose>
            {previewChange.isError ? (
              <Button onClick={() => requestPreview(proposal, { onSuccess: setPreview })}>
                Zkusit znovu
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const summary = toSummaryProps(preview.summary)
  const isCancellation = preview.kinds.every((kind) => kind.startsWith("cancel"))
  const consentMoves = preview.moves.filter((move) => move.requiresReleaseConsent)
  const labelsOf = (termIds: string[]) =>
    termIds
      .map((termId) => preview.summary.terms.find((term) => term.termId === termId)?.label ?? "")
      .join(", ")
  // One consent covers every confirmed place the change gives up.
  const release: ReleaseConsent | undefined =
    consentMoves.length > 0
      ? {
          targetTerm: labelsOf(consentMoves.map((move) => move.toTermId)),
          lostTerm: labelsOf(consentMoves.map((move) => move.fromTermId)),
        }
      : undefined

  const confirm = (isReleaseAccepted: boolean) => {
    setError(null)
    submitChange.mutate(
      {
        ...proposal,
        moves: proposal.moves.map((move) => ({ ...move, acceptRelease: isReleaseAccepted })),
        expectedVersion: preview.version,
        expectsApproval: preview.requiresApproval,
      },
      {
        onSuccess: onDone,
        onError: (failure) => {
          const described = describeChangeError(failure)
          if (described.kind === "stale") {
            setIsStale(true)
          } else if (described.kind === "approval_changed") {
            setIsApprovalNewlyRequired(described.preview.requiresApproval)
            setPreview(described.preview)
          } else if (described.kind === "release_consent_required") {
            setPreview(described.preview)
          } else {
            setError(described)
          }
        },
      },
    )
  }

  return (
    <RegistrationChangeDialog
      isOpen
      isCancellation={isCancellation}
      summary={summary}
      isApprovalRequired={preview.requiresApproval && !isApprovalNewlyRequired}
      isApprovalNewlyRequired={preview.requiresApproval && isApprovalNewlyRequired}
      hasFinancialImpact={preview.summary.terms.some((term) => term.original !== term.proposed)}
      release={release}
      errorMessage={error?.kind === "message" ? error.message : undefined}
      isStale={isStale}
      isSubmitting={submitChange.isPending}
      onOpenChange={(isOpen) => (isOpen ? undefined : onClose())}
      onConfirm={confirm}
      onReload={onReload}
    />
  )
}
