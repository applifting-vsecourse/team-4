import { http, HttpResponse } from "msw"
import { z } from "zod"

import { env } from "@/config/env"

import type { ParticipantRegistration } from "@/features/registrations/api/participantRegistrationSchemas"
import type { QrPaymentPage } from "@/features/registrations/api/qrPaymentSchemas"
import type {
  ChangePreview,
  RegistrationChange,
} from "@/features/registrations/api/registrationChangeSchemas"
import { registrationNeedsSchema } from "@/features/registrations/api/registrationSchemas"
import type { RegistrationResult } from "@/features/registrations/api/registrationSchemas"
import {
  AVAILABLE_TERMS,
  OWN_REGISTRATIONS,
} from "@/features/registrations/fixtures/participantRegistrations"
import {
  makeQrPaymentPage,
  makeRegistrationResult,
} from "@/features/registrations/fixtures/publicRegistration"
import {
  makeChangePreview,
  makeOwnChange,
} from "@/features/registrations/fixtures/registrationChanges"
import {
  makeRegistrationDetail,
  makeRegistrationList,
} from "@/features/registrations/fixtures/registrations"

// MSW handlers for registrations: the organizer's view of an event and the
// participant's own. Install with `msw.use(...)` in a story's `beforeEach`.

const EVENT_LIST = `${env.VITE_API_URL}/organizations/:organizationId/events/:eventId/registrations`
const EVENT_CHANGES = `${env.VITE_API_URL}/organizations/:organizationId/events/:eventId`
const OWN_LIST = `${env.VITE_API_URL}/participant/registrations`
const PUBLIC_SUBMIT = `${env.VITE_API_URL}/public/events/:publicId/registrations`
const QR_PAYMENT = `${env.VITE_API_URL}/public/payments/:token`

const qrPaymentInputSchema = z.object({ amountMinor: z.number().int() })

const registrationNeedsCorrectionSchema = z.object({
  expectedVersion: z.number().int(),
  needs: registrationNeedsSchema,
})

const notFound = () => HttpResponse.json({ message: "Not Found" }, { status: 404 })

export const registrationHandlers = {
  /** The public form saves the registration and answers with its result. */
  submitted: (result: RegistrationResult = makeRegistrationResult()) => [
    http.post(PUBLIC_SUBMIT, () => HttpResponse.json(result, { status: 201 })),
  ],
  /** The QR payment page; a payment lowers the debt by the amount paid. */
  qrPayment: (page: QrPaymentPage = makeQrPaymentPage()) => [
    http.get(QR_PAYMENT, () => HttpResponse.json(page)),
    http.post(QR_PAYMENT, async ({ request }) => {
      const { amountMinor } = qrPaymentInputSchema.parse(await request.json())
      return HttpResponse.json({
        paidMinor: amountMinor,
        balanceMinor: page.balanceMinor - amountMinor,
      })
    }),
  ],
  event: () => [
    http.get(EVENT_LIST, () => HttpResponse.json(makeRegistrationList())),
    http.get(`${EVENT_CHANGES}/change-requests`, () => HttpResponse.json({ changes: [] })),
    http.get(`${EVENT_LIST}/:registrationId/changes`, () => HttpResponse.json({ changes: [] })),
    http.put(`${EVENT_LIST}/:registrationId/needs`, async ({ request }) => {
      const { needs, expectedVersion } = registrationNeedsCorrectionSchema.parse(
        await request.json(),
      )
      return HttpResponse.json(makeRegistrationDetail({ needs, version: expectedVersion + 1 }))
    }),
    http.get(`${EVENT_LIST}/:registrationId`, () =>
      HttpResponse.json(
        makeRegistrationDetail({
          paidMinor: 200_000,
          balanceMinor: 250_000,
          paymentState: "partial",
          payments: [
            {
              id: "0190c0de-0000-7000-8000-000000000501",
              receivedOn: "2027-03-05",
              amountMinor: 200_000,
              source: "organizer",
            },
          ],
        }),
      ),
    ),
  ],
  own: () => [
    http.get(OWN_LIST, () => HttpResponse.json({ registrations: OWN_REGISTRATIONS })),
    http.get(`${OWN_LIST}/:registrationId/changes`, () => HttpResponse.json({ changes: [] })),
    http.get(`${OWN_LIST}/:registrationId`, ({ params }) => {
      const registration = OWN_REGISTRATIONS.find(({ id }) => id === params.registrationId)
      return registration
        ? HttpResponse.json({ ...registration, availableTerms: AVAILABLE_TERMS })
        : notFound()
    }),
  ],
  /** Requests waiting for the organizer's decision, for the whole event. */
  eventChangeRequests: (changes: RegistrationChange[]) => [
    http.get(`${EVENT_CHANGES}/change-requests`, () => HttpResponse.json({ changes })),
  ],
  /** Changes of one registration as the organizer sees them. */
  registrationChanges: (changes: RegistrationChange[]) => [
    http.get(`${EVENT_LIST}/:registrationId/changes`, () => HttpResponse.json({ changes })),
  ],
  /** The own registration, changed for one story (cancelled, pending request…). */
  ownRegistration: (registration: ParticipantRegistration) => [
    http.get(`${OWN_LIST}/:registrationId`, () =>
      HttpResponse.json({ ...registration, availableTerms: AVAILABLE_TERMS }),
    ),
  ],
  /** Stored changes of the own registration: requests and their history. */
  ownChanges: (changes: RegistrationChange[]) => [
    http.get(`${OWN_LIST}/:registrationId/changes`, () => HttpResponse.json({ changes })),
  ],
  /** What the server shows before a change, and how it stores it. */
  ownChange: (
    preview: ChangePreview = makeChangePreview(),
    outcome: "applied" | "requested" = preview.requiresApproval ? "requested" : "applied",
  ) => [
    http.post(`${OWN_LIST}/:registrationId/changes/preview`, () => HttpResponse.json(preview)),
    http.post(`${OWN_LIST}/:registrationId/changes`, () =>
      HttpResponse.json({
        outcome,
        change: makeOwnChange({
          status: outcome === "applied" ? "applied" : "pending",
          kinds: preview.kinds,
          summary: preview.summary,
        }),
      }),
    ),
  ],
}
