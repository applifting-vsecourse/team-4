import { randomUUID } from "node:crypto"
import { type APIRequestContext, type APIResponse } from "@playwright/test"

// Test setup through the REST API, so a scenario spends its time in the
// browser only on what it checks. Pass `page.request` to act as the
// organizer of that page: it shares the page's cookies.

const frontendUrl = process.env.E2E_BASE_URL ?? "http://localhost:3050"
// Deployed frontends proxy /api on their own origin; local development uses
// a separate backend port. E2E_API_URL also supports deployments with a
// separate API host and must include the API path (usually /api).
export const API_URL = (
  process.env.E2E_API_URL ??
  (process.env.E2E_BASE_URL ? new URL("/api", frontendUrl).href : "http://localhost:4050/api")
).replace(/\/$/, "")
/** BetterAuth and CORS accept writes only from the frontend's origin. */
const headers = { Origin: new URL(frontendUrl).origin }

const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
let counter = 0

/** A suffix no other test or run uses, for names and e-mails. */
export function uniqueSuffix() {
  counter += 1
  return `${run}-${counter}`
}

async function json<T>(response: APIResponse): Promise<T> {
  if (!response.ok()) {
    throw new Error(`${response.url()} answered ${response.status()}: ${await response.text()}`)
  }
  return (await response.json()) as T
}

const post = async <T>(request: APIRequestContext, path: string, data?: unknown) =>
  json<T>(await request.post(`${API_URL}${path}`, { data, headers }))

export type Organizer = { name: string; email: string; password: string }

/** Signs up a new organizer; the session cookie stays in `request`. */
export async function signUpOrganizer(request: APIRequestContext): Promise<Organizer> {
  const suffix = uniqueSuffix()
  const organizer = {
    name: "Eva Pořadatelka",
    email: `eva-${suffix}@example.test`,
    password: "e2e-heslo-123",
  }
  await post(request, "/auth/sign-up/email", organizer)
  return organizer
}

export async function createOrganization(
  request: APIRequestContext,
  name = `Oddíl ${uniqueSuffix()}`,
): Promise<{ id: string; name: string }> {
  return post(request, "/organizations", { name })
}

export type TermSpec = { label: string; startDate: string; endDate: string; priceMinor: number }
/** `terms` are indexes into the event's terms. */
export type RoomSpec = { label: string; bedCount: number; terms: number[] }

export type OpenEvent = {
  organizer: Organizer
  organizationId: string
  eventId: string
  publicId: string
  termIds: string[]
  name: string
  location: string
}

type EventDetail = { id: string; publicId: string; terms: { id: string; label: string }[] }

/**
 * A new organizer with an organization and an event with these terms, rooms
 * and payment settings, open for registration unless `isOpen: false`.
 */
export async function setUpEvent(
  request: APIRequestContext,
  { terms, rooms = [], isOpen = true }: { terms: TermSpec[]; rooms?: RoomSpec[]; isOpen?: boolean },
): Promise<OpenEvent> {
  const organizer = await signUpOrganizer(request)
  const organization = await createOrganization(request)
  const name = `Letní tábor ${uniqueSuffix()}`
  const location = `Tábořiště ${uniqueSuffix()}`
  const eventPath = `/organizations/${organization.id}/events`
  const created = await post<EventDetail>(request, eventPath, {
    name,
    description: "Týden v lesích.",
    location,
  })
  const path = `${eventPath}/${created.id}`

  const termIds: string[] = []
  for (const term of terms) {
    const event = await post<EventDetail>(request, `${path}/terms`, term)
    termIds.push(event.terms.find((saved) => saved.label === term.label)!.id)
  }
  for (const room of rooms) {
    await post(request, `${path}/rooms`, {
      label: room.label,
      bedCount: room.bedCount,
      termIds: room.terms.map((index) => termIds[index]),
    })
  }
  await json(
    await request.put(`${API_URL}${path}/payment-settings`, {
      data: {
        bankAccountPrefix: null,
        bankAccountNumber: "2000145399",
        bankCode: "0800",
        paymentReminderDays: 14,
      },
      headers,
    }),
  )
  if (isOpen) await post(request, `${path}/open-registration`)

  return {
    organizer,
    organizationId: organization.id,
    eventId: created.id,
    publicId: created.publicId,
    termIds,
    name,
    location,
  }
}

export type Participant = { firstName: string; lastName: string; email: string }

export function newParticipant(firstName: string): Participant {
  return {
    firstName,
    lastName: "Nováková",
    email: `${firstName.toLowerCase()}-${uniqueSuffix()}@example.test`,
  }
}

/** Submits the public form for `termIds`; anonymous, like a visitor. */
export async function register(
  request: APIRequestContext,
  publicId: string,
  participant: Participant,
  termIds: string[],
): Promise<{ id: string }> {
  return post(request, `/public/events/${publicId}/registrations`, {
    submissionKey: randomUUID(),
    ...participant,
    phone: "+420 777 123 456",
    termIds,
  })
}

/** Today's date in Prague, as the API's `receivedOn` expects it. */
const todayInPrague = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague" }).format(new Date())

/** Records a payment received today, as the event's organizer. */
export async function recordPayment(
  request: APIRequestContext,
  event: OpenEvent,
  registrationId: string,
  amountMinor: number,
): Promise<void> {
  await post(
    request,
    `/organizations/${event.organizationId}/events/${event.eventId}/registrations/${registrationId}/payments`,
    { submissionKey: randomUUID(), amountMinor, receivedOn: todayInPrague() },
  )
}
