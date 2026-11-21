import {
  participantNotificationListSchema,
  type ParticipantNotification,
} from "@/features/participant-access/api/participantNotificationSchemas"

// Preview data for Oznámení (S4-06), parsed with the API schema so it can't
// drift from the contract. Newest first, as the server sends them. The
// registrations are those of the participant registration fixtures (same ids,
// events and terms), so a notification opens a detail the stories serve.

const uuid = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`

const SUMMER_CAMP = { id: uuid(1), name: "Letní tábor Modrá Hora 2027" }
const SPRING_TRIP = { id: uuid(6), name: "Jarní výlet na Sněžku" }
const AUGUST = { label: "Turnus 2", startDate: "2027-08-01", endDate: "2027-08-14" }
const SATURDAY = { label: "Sobota", startDate: "2027-04-17", endDate: "2027-04-17" }
const SUNDAY = { label: "Neděle", startDate: "2027-04-18", endDate: "2027-04-18" }

export const NOTIFICATIONS: ParticipantNotification[] = participantNotificationListSchema.parse({
  items: [
    // Unread: a payment of the summer camp.
    {
      id: uuid(901),
      kind: "payment",
      registrationId: SUMMER_CAMP.id,
      eventName: SUMMER_CAMP.name,
      at: "2027-03-05T13:20:00.000Z",
      isRead: false,
      terms: [],
      amountMinor: 200_000,
    },
    // Unread: the organizer decided one term of the summer camp.
    {
      id: uuid(902),
      kind: "decision",
      registrationId: SUMMER_CAMP.id,
      eventName: SUMMER_CAMP.name,
      at: "2027-03-04T08:05:00.000Z",
      isRead: false,
      terms: [{ ...AUGUST, status: "waitlisted" }],
      amountMinor: null,
    },
    // Read: an approved request that moved the participant to another term.
    {
      id: uuid(903),
      kind: "changeApproved",
      registrationId: SPRING_TRIP.id,
      eventName: SPRING_TRIP.name,
      at: "2027-02-20T16:45:00.000Z",
      isRead: true,
      terms: [
        { ...SATURDAY, status: "cancelled" },
        { ...SUNDAY, status: "pending" },
      ],
      amountMinor: null,
    },
    // Read: a rejected request that kept the term.
    {
      id: uuid(904),
      kind: "changeRejected",
      registrationId: SPRING_TRIP.id,
      eventName: SPRING_TRIP.name,
      at: "2027-02-10T10:00:00.000Z",
      isRead: true,
      terms: [{ ...SATURDAY, status: "confirmed" }],
      amountMinor: null,
    },
  ],
}).items

/** Everything opened already: no dot anywhere. */
export const READ_NOTIFICATIONS = NOTIFICATIONS.map((item) => ({ ...item, isRead: true }))
