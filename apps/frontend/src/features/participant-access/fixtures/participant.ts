import {
  participantProfileSchema,
  participantSchema,
  type Participant,
  type ParticipantProfile,
} from "@/features/participant-access/api/participantSchemas"

// The participant with a verified magic-link session in previews.

export const PARTICIPANT: Participant = participantSchema.parse({
  email: "anna.novakova@example.cz",
})

/** Her filled-in profile (S4-08). */
export const PROFILE: ParticipantProfile = participantProfileSchema.parse({
  email: PARTICIPANT.email,
  firstName: "Anna",
  lastName: "Nováková",
  phone: "+420604123456",
})

/** A profile nobody filled in yet: only the sign-in e-mail. */
export const EMPTY_PROFILE: ParticipantProfile = participantProfileSchema.parse({
  email: PARTICIPANT.email,
  firstName: null,
  lastName: null,
  phone: null,
})
