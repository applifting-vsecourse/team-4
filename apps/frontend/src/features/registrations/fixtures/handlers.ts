import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import { OWN_REGISTRATIONS } from "@/features/registrations/fixtures/participantRegistrations"
import {
  makeRegistrationDetail,
  makeRegistrationList,
} from "@/features/registrations/fixtures/registrations"

// MSW handlers for registrations: the organizer's view of an event and the
// participant's own. Install with `msw.use(...)` in a story's `beforeEach`.

const EVENT_LIST = `${env.VITE_API_URL}/organizations/:organizationId/events/:eventId/registrations`
const OWN_LIST = `${env.VITE_API_URL}/participant/registrations`

const notFound = () => HttpResponse.json({ message: "Not Found" }, { status: 404 })

export const registrationHandlers = {
  event: () => [
    http.get(EVENT_LIST, () => HttpResponse.json(makeRegistrationList())),
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
            },
          ],
        }),
      ),
    ),
  ],
  own: () => [
    http.get(OWN_LIST, () => HttpResponse.json({ registrations: OWN_REGISTRATIONS })),
    http.get(`${OWN_LIST}/:registrationId`, ({ params }) => {
      const registration = OWN_REGISTRATIONS.find(({ id }) => id === params.registrationId)
      return registration ? HttpResponse.json(registration) : notFound()
    }),
  ],
}
