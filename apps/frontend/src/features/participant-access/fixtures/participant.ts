import {
  participantSchema,
  type Participant,
} from "@/features/participant-access/api/participantSchemas"

// The participant with a verified magic-link session in previews.

export const PARTICIPANT: Participant = participantSchema.parse({
  email: "anna.novakova@example.cz",
})
