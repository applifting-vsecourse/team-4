import { type ChangeProposal } from "@/features/registrations/api/registrationChangeSchemas"
import { type ContactErrors } from "@/features/registrations/components/RegistrationChangeForm"

/** What the edit form currently holds. */
export type EditState = {
  firstName: string
  lastName: string
  phone: string
  /** By the active term it belongs to. */
  terms: Record<string, { selectedTermId: string; isCancelled: boolean }>
}

type Contact = { firstName: string; lastName: string; phone: string }

const squash = (phone: string) => phone.replace(/\s+/g, "")

/** The fields the registration form requires; the server validates them again. */
export function validateContact(state: EditState): ContactErrors {
  const errors: ContactErrors = {}
  if (state.firstName.trim() === "") errors.firstName = "Vyplňte jméno."
  if (state.lastName.trim() === "") errors.lastName = "Vyplňte příjmení."
  if (!/^\+[1-9]\d{6,14}$/.test(squash(state.phone))) {
    errors.phone = "Zadejte telefon s mezinárodní předvolbou, např. +420 777 123 456."
  }
  return errors
}

/**
 * Only what differs from the registration is proposed; null when nothing does.
 * A term picked for another term is a move, a ticked one a cancellation.
 */
export function buildProposal(contact: Contact, state: EditState): ChangeProposal | null {
  const proposal: ChangeProposal = { moves: [], cancelledTermIds: [] }
  if (state.firstName.trim() !== contact.firstName) proposal.firstName = state.firstName.trim()
  if (state.lastName.trim() !== contact.lastName) proposal.lastName = state.lastName.trim()
  if (squash(state.phone) !== contact.phone) proposal.phone = state.phone.trim()

  for (const [termId, choice] of Object.entries(state.terms)) {
    if (choice.isCancelled) proposal.cancelledTermIds.push(termId)
    else if (choice.selectedTermId !== termId) {
      proposal.moves.push({
        fromTermId: termId,
        toTermId: choice.selectedTermId,
        acceptWaitlist: false,
      })
    }
  }

  const isChanged =
    proposal.firstName !== undefined ||
    proposal.lastName !== undefined ||
    proposal.phone !== undefined ||
    proposal.moves.length > 0 ||
    proposal.cancelledTermIds.length > 0
  return isChanged ? proposal : null
}
