import { http, HttpResponse } from "msw"
import { z } from "zod"

import { env } from "@/config/env"

import { registrationNeedsSchema } from "@/features/registrations/api/registrationSchemas"
import {
  AVAILABLE_TERMS,
  OWN_REGISTRATIONS,
} from "@/features/registrations/fixtures/participantRegistrations"
import {
  makeRegistrationDetail,
  makeRegistrationList,
} from "@/features/registrations/fixtures/registrations"

// MSW handlers for registrations: the organizer's view of an event and the
// participant's own. Install with `msw.use(...)` in a story's `beforeEach`.

const EVENT_LIST = `${env.VITE_API_URL}/organizations/:organizationId/events/:eventId/registrations`
const EVENT_CHANGES = `${env.VITE_API_URL}/organizations/:organizationId/events/:eventId`
const OWN_LIST = `${env.VITE_API_URL}/participant/registrations`

const registrationNeedsCorrectionSchema = z.object({
  expectedVersion: z.number().int(),
  needs: registrationNeedsSchema,
})

const notFound = () => HttpResponse.json({ message: "Not Found" }, { status: 404 })

export const registrationHandlers = {
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
}
