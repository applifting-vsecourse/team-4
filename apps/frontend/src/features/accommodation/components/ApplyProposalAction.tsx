import { useState } from "react"
import { Check } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { readApiError } from "@/lib/apiError"

import {
  ApplyProposalDialog,
  type ApplyProposalState,
} from "@/features/accommodation/components/ApplyProposalDialog"
import { useApplyProposal } from "@/features/accommodation/hooks/useApplyProposal"
import {
  hasApplyChanges,
  toApplyChanges,
  type RoomProposalLayout,
} from "@/features/accommodation/lib/roomProposalView"

export type ApplyProposalActionProps = {
  organizationId: string
  eventId: string
  termId: string
  /** Already formatted, e.g. "1. turnus, 4.–17. 7. 2027". */
  term: string
  /** The current proposal the organizer reviewed. */
  proposalId: string
  layout: RoomProposalLayout
  /** Starts a new proposal after a refusal as stale. */
  onPropose: () => void
}

// "Použít návrh" of a current room proposal (#390): the button, the review of
// the changes and the one explicit step. Nothing to change, no button. The
// key is new for every opening of the dialog and kept for its retries.
export function ApplyProposalAction({
  organizationId,
  eventId,
  termId,
  term,
  proposalId,
  layout,
  onPropose,
}: ApplyProposalActionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [submissionKey, setSubmissionKey] = useState("")
  const apply = useApplyProposal(organizationId, eventId, termId)
  const changes = toApplyChanges(layout)

  if (!hasApplyChanges(changes)) return null

  const state: ApplyProposalState = apply.isPending
    ? "saving"
    : apply.isError
      ? readApiError(apply.error).code === "proposal_stale"
        ? "stale"
        : "failed"
      : "review"

  const open = () => {
    apply.reset()
    setSubmissionKey(crypto.randomUUID())
    setIsOpen(true)
  }

  return (
    <>
      <Button onClick={open}>
        <Check />
        Použít návrh
      </Button>
      <ApplyProposalDialog
        isOpen={isOpen}
        state={state}
        term={term}
        changes={changes}
        onOpenChange={setIsOpen}
        onApply={() =>
          apply.mutate(
            { proposalId, submissionKey },
            {
              onSuccess: () => {
                setIsOpen(false)
                // The neutral toast: the green one fails the contrast check (#400).
                toast.success("Návrh pokojů byl použit.", { richColors: false })
              },
            },
          )
        }
        onPropose={() => {
          setIsOpen(false)
          onPropose()
        }}
      />
    </>
  )
}
