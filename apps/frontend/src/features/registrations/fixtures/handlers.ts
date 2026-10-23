import { delay, http, HttpResponse } from "msw"

import { env } from "@/config/env"

import {
  type RegistrationDetail,
  type RegistrationList,
} from "@/features/registrations/api/eventRegistrationSchemas"
import {
  makeRegistrationDetail,
  makeRegistrationList,
} from "@/features/registrations/fixtures/registrations"

// MSW handlers for the organizer's registrations API, used by stories of
// components that fetch for themselves. Install with `msw.use(...)` in a
// story's `beforeEach`.

const LIST = `${env.VITE_API_URL}/organizations/:organizationId/events/:eventId/registrations`
const DETAIL = `${LIST}/:registrationId`

export const registrationHandlers = {
  list: (data: RegistrationList = makeRegistrationList()) => [
    http.get(LIST, () => HttpResponse.json(data)),
  ],
  empty: () => [http.get(LIST, () => HttpResponse.json(makeRegistrationList([])))],
  error: (status = 500) => [
    http.get(LIST, () => HttpResponse.json({ message: "Internal server error" }, { status })),
  ],
  loading: () => [
    http.get(LIST, async () => {
      await delay("infinite")
      return HttpResponse.json(makeRegistrationList())
    }),
  ],
  detail: (data: RegistrationDetail = makeRegistrationDetail()) => [
    http.get(DETAIL, () => HttpResponse.json(data)),
  ],
}
