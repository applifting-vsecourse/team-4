import { type EventStatus } from "@/features/events/api/eventSchemas"
import { type PaymentSettings } from "@/features/events/api/paymentSettingsSchemas"
import { type ParticipationStatus } from "@/features/registrations/api/registrationSchemas"

// What the mock backend stores: the server-side records behind the API, not
// the shapes the API returns (those are derived in MockBackend and checked
// against the feature schemas in handlers.ts).

export type MockUser = { id: string; name: string; email: string; password: string }

export type MockOrganization = { id: string; ownerId: string; name: string }

export type MockTerm = {
  id: string
  label: string
  /** `yyyy-MM-dd` */
  startDate: string
  endDate: string
  priceMinor: number
}

export type MockRoom = { id: string; label: string; bedCount: number; termIds: string[] }

export type MockEvent = {
  id: string
  organizationId: string
  publicId: string
  name: string
  description: string
  location: string
  status: EventStatus
  isLocked: boolean
  createdAt: string
  terms: MockTerm[]
  rooms: MockRoom[]
  paymentSettings: PaymentSettings | null
}

export type MockPayment = {
  id: string
  submissionKey: string
  /** `yyyy-MM-dd` */
  receivedOn: string
  amountMinor: number
}

export type MockBankAccount = { prefix: string | null; number: string; bankCode: string }

export type MockRegistration = {
  id: string
  eventId: string
  submissionKey: string
  receivedAt: string
  firstName: string
  lastName: string
  email: string
  phone: string
  terms: { termId: string; status: ParticipationStatus }[]
  variableSymbol: string
  /** The event's account when the registration was received (S2-09). */
  account: MockBankAccount
  /** Null while nothing is due. */
  reminderAt: string | null
  payments: MockPayment[]
}

/** What a prototype starts with. Sessions are chosen separately. */
export type MockData = {
  users: MockUser[]
  organizations: MockOrganization[]
  events: MockEvent[]
  registrations: MockRegistration[]
}

/** An e-mail the backend would have sent, shown in the prototype's mailbox. */
export type MockEmail = {
  id: string
  to: string
  subject: string
  sentAt: string
  text: string
  action: { label: string; path: string }
}

export type MockSessions = {
  /** The signed-in organizer (BetterAuth cookie). */
  organizerId: string | null
  /** The verified participant (magic-link session cookie). */
  participantEmail: string | null
}
