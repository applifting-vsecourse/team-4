import {
  eventDetailSchema,
  eventSummariesSchema,
  type EventDetail,
  type EventSummary,
} from "@/features/events/api/eventSchemas"

// Preview data, parsed with the API schemas so it can't drift from the
// contract. Term ids match the registration fixtures.

const uuid = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`

/** Summer camp with open registration: locked, two terms, payments set up. */
export const OPEN_EVENT: EventDetail = eventDetailSchema.parse({
  id: uuid(301),
  name: "Letní tábor Modrá Hora 2027",
  description:
    "Dva týdny v lesním táboře pod Modrou Horou: celotáborová hra, výlety po okolí a večery u ohně. Ubytování ve chatkách, strava pětkrát denně.",
  location: "Tábořiště Modrá Hora, Horní Lhota 12, 539 01 Hlinsko",
  status: "open",
  isLocked: true,
  terms: [
    {
      id: uuid(101),
      label: "Turnus 1",
      startDate: "2027-07-04",
      endDate: "2027-07-17",
      priceMinor: 450_000,
      capacity: 24,
    },
    {
      id: uuid(102),
      label: "Turnus 2",
      startDate: "2027-08-01",
      endDate: "2027-08-14",
      priceMinor: 450_000,
      capacity: 18,
    },
  ],
  paymentSettings: {
    bankAccountPrefix: null,
    bankAccountNumber: "2501234567",
    bankCode: "2010",
    paymentReminderDays: 14,
  },
  publicId: "letni-tabor-2027",
  openingBlockers: [],
})

/** Autumn weekend still in preparation: editable, one term. */
export const DRAFT_EVENT: EventDetail = eventDetailSchema.parse({
  id: uuid(302),
  name: "Podzimní víkend pro vedoucí",
  description: "Školení vedoucích před další sezónou: první pomoc, hry a plánování programu.",
  location: "Chata Javor, Pec pod Sněžkou 88",
  status: "draft",
  isLocked: false,
  terms: [
    {
      id: uuid(103),
      label: "Víkend",
      startDate: "2027-10-15",
      endDate: "2027-10-17",
      priceMinor: 120_000,
      capacity: 0,
    },
  ],
  paymentSettings: null,
  publicId: "podzimni-vikend-2027",
  openingBlockers: ["paymentSettings"],
})

const toSummary = (event: EventDetail): EventSummary => ({
  id: event.id,
  name: event.name,
  description: event.description,
  location: event.location,
  status: event.status,
  termCount: event.terms.length,
  period: event.terms.length
    ? { startDate: event.terms[0]!.startDate, endDate: event.terms.at(-1)!.endDate }
    : null,
})

export const EVENTS: EventDetail[] = [OPEN_EVENT, DRAFT_EVENT]

export const EVENT_SUMMARIES: EventSummary[] = eventSummariesSchema.parse(EVENTS.map(toSummary))
