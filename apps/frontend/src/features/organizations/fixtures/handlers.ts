import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import { ORGANIZATIONS } from "@/features/organizations/fixtures/organizations"

// MSW handlers for the organizer's organizations. Install with `msw.use(...)`
// in a story's `beforeEach`.

const LIST = `${env.VITE_API_URL}/organizations`

export const organizationHandlers = {
  list: () => [
    http.get(LIST, () => HttpResponse.json(ORGANIZATIONS)),
    http.get(`${LIST}/:organizationId`, ({ params }) => {
      const organization = ORGANIZATIONS.find(({ id }) => id === params.organizationId)
      return organization
        ? HttpResponse.json(organization)
        : HttpResponse.json({ message: "Not Found" }, { status: 404 })
    }),
  ],
}
