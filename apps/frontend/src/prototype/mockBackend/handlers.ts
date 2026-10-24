import { delay, http, HttpResponse, type JsonBodyType } from "msw"
import { type z } from "zod"

import { env } from "@/config/env"
import { HttpFailure, mockBackend, type MockBackend } from "@/prototype/mockBackend/MockBackend"
import { type MockUser } from "@/prototype/mockBackend/model"

import {
  eventDetailSchema,
  eventSummariesSchema,
  type EventInput,
  type TermInput,
} from "@/features/events/api/eventSchemas"
import { type PaymentSettings } from "@/features/events/api/paymentSettingsSchemas"
import {
  organizationSchema,
  organizationsSchema,
} from "@/features/organizations/api/organizationSchemas"
import {
  magicLinkRequestedSchema,
  participantSchema,
} from "@/features/participant-access/api/participantSchemas"
import { publicEventSchema } from "@/features/public-events/api/publicEventSchemas"
import {
  registrationDetailSchema,
  registrationFilterSchema,
  registrationListSchema,
} from "@/features/registrations/api/eventRegistrationSchemas"
import {
  participantRegistrationListSchema,
  participantRegistrationSchema,
} from "@/features/registrations/api/participantRegistrationSchemas"
import {
  registrationResultSchema,
  type RegistrationInput,
} from "@/features/registrations/api/registrationSchemas"
import { type PaymentInput } from "@/features/registrations/hooks/useRecordPayment"
import { roomsOverviewSchema, type RoomInput } from "@/features/rooms/api/roomSchemas"

// MSW handlers in front of the mock backend: every endpoint the frontend
// calls, BetterAuth included. Every answer is parsed with the feature's zod
// schema first, so a mock that drifts from the API contract fails loudly in
// the story instead of rendering a state the server cannot produce.

const API = env.VITE_API_URL
const AUTH = `${env.VITE_BETTER_AUTH_URL}/api/auth`
const ORGANIZATION = `${API}/organizations/:organizationId`
const EVENT = `${ORGANIZATION}/events/:eventId`
const REGISTRATION = `${EVENT}/registrations/:registrationId`

type Params = Record<string, string>
type Call = { request: Request; params: Params; body: unknown; backend: MockBackend }

const json = <S extends z.ZodType>(schema: S, data: z.input<S>, status = 200) =>
  HttpResponse.json(schema.parse(data) as JsonBodyType, { status })

const noContent = () => new HttpResponse(null, { status: 204 })

/** Latency, the "server down" switch and refused requests, for every endpoint. */
const handle =
  (respond: (call: Call) => Response) =>
  async ({ request, params }: { request: Request; params: Record<string, unknown> }) => {
    const { latency, isServerDown } = mockBackend.config
    if (latency > 0) await delay(latency)
    if (isServerDown) {
      return HttpResponse.json(
        { statusCode: 500, message: "Internal server error" },
        { status: 500 },
      )
    }
    const text = request.method === "GET" ? "" : await request.text()
    try {
      return respond({
        request,
        params: params as Params,
        body: text ? (JSON.parse(text) as unknown) : undefined,
        backend: mockBackend,
      })
    } catch (error) {
      if (error instanceof HttpFailure) {
        return HttpResponse.json(error.body, { status: error.status })
      }
      console.error("[mock backend]", request.method, request.url, error)
      return HttpResponse.json({ statusCode: 500, message: String(error) }, { status: 500 })
    }
  }

/** What BetterAuth's client reads from a session or a sign-in answer. */
const authUser = (user: MockUser) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  emailVerified: true,
  image: null,
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt: "2026-09-01T08:00:00.000Z",
})

const authHandlers = [
  http.get(
    `${AUTH}/get-session`,
    handle(({ backend }) => {
      const user = backend.getSession()
      if (!user) return HttpResponse.json(null)
      return HttpResponse.json({
        session: {
          id: `session-${user.id}`,
          userId: user.id,
          token: `token-${user.id}`,
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
        user: authUser(user),
      })
    }),
  ),
  http.post(
    `${AUTH}/sign-in/email`,
    handle(({ backend, body }) => {
      const input = body as { email: string; password: string }
      const user = backend.signIn(input.email, input.password)
      return HttpResponse.json({ redirect: false, token: `token-${user.id}`, user: authUser(user) })
    }),
  ),
  http.post(
    `${AUTH}/sign-up/email`,
    handle(({ backend, body }) => {
      const user = backend.signUp(body as { name: string; email: string; password: string })
      return HttpResponse.json({ token: `token-${user.id}`, user: authUser(user) })
    }),
  ),
  http.post(
    `${AUTH}/sign-out`,
    handle(({ backend }) => {
      backend.signOut()
      return HttpResponse.json({ success: true })
    }),
  ),
]

const organizerHandlers = [
  http.get(
    `${API}/organizations`,
    handle(({ backend }) => json(organizationsSchema, backend.listOrganizations())),
  ),
  http.post(
    `${API}/organizations`,
    handle(({ backend, body }) =>
      json(organizationSchema, backend.createOrganization(body as { name: string }), 201),
    ),
  ),
  http.get(
    ORGANIZATION,
    handle(({ backend, params }) =>
      json(organizationSchema, backend.getOrganization(params.organizationId!)),
    ),
  ),
  http.get(
    `${ORGANIZATION}/events`,
    handle(({ backend, params }) =>
      json(eventSummariesSchema, backend.listEvents(params.organizationId!)),
    ),
  ),
  http.post(
    `${ORGANIZATION}/events`,
    handle(({ backend, params, body }) =>
      json(eventDetailSchema, backend.createEvent(params.organizationId!, body as EventInput), 201),
    ),
  ),
  http.get(
    EVENT,
    handle(({ backend, params }) =>
      json(eventDetailSchema, backend.getEvent(params.organizationId!, params.eventId!)),
    ),
  ),
  http.put(
    EVENT,
    handle(({ backend, params, body }) =>
      json(
        eventDetailSchema,
        backend.updateEvent(params.organizationId!, params.eventId!, body as EventInput),
      ),
    ),
  ),
  http.post(
    `${EVENT}/terms`,
    handle(({ backend, params, body }) =>
      json(
        eventDetailSchema,
        backend.saveTerm(params.organizationId!, params.eventId!, null, body as TermInput),
        201,
      ),
    ),
  ),
  http.put(
    `${EVENT}/terms/:termId`,
    handle(({ backend, params, body }) =>
      json(
        eventDetailSchema,
        backend.saveTerm(
          params.organizationId!,
          params.eventId!,
          params.termId!,
          body as TermInput,
        ),
      ),
    ),
  ),
  http.delete(
    `${EVENT}/terms/:termId`,
    handle(({ backend, params }) =>
      json(
        eventDetailSchema,
        backend.deleteTerm(params.organizationId!, params.eventId!, params.termId!),
      ),
    ),
  ),
  http.put(
    `${EVENT}/payment-settings`,
    handle(({ backend, params, body }) =>
      json(
        eventDetailSchema,
        backend.updatePaymentSettings(
          params.organizationId!,
          params.eventId!,
          body as PaymentSettings,
        ),
      ),
    ),
  ),
  http.post(
    `${EVENT}/open-registration`,
    handle(({ backend, params }) =>
      json(eventDetailSchema, backend.openRegistration(params.organizationId!, params.eventId!)),
    ),
  ),
  http.get(
    `${EVENT}/rooms`,
    handle(({ backend, params }) =>
      json(roomsOverviewSchema, backend.getRooms(params.organizationId!, params.eventId!)),
    ),
  ),
  http.post(
    `${EVENT}/rooms`,
    handle(({ backend, params, body }) =>
      json(
        roomsOverviewSchema,
        backend.saveRoom(params.organizationId!, params.eventId!, null, body as RoomInput),
        201,
      ),
    ),
  ),
  http.put(
    `${EVENT}/rooms/:roomId`,
    handle(({ backend, params, body }) =>
      json(
        roomsOverviewSchema,
        backend.saveRoom(
          params.organizationId!,
          params.eventId!,
          params.roomId!,
          body as RoomInput,
        ),
      ),
    ),
  ),
  http.delete(
    `${EVENT}/rooms/:roomId`,
    handle(({ backend, params }) =>
      json(
        roomsOverviewSchema,
        backend.deleteRoom(params.organizationId!, params.eventId!, params.roomId!),
      ),
    ),
  ),
  http.get(
    `${EVENT}/registrations`,
    handle(({ backend, params, request }) => {
      const query = Object.fromEntries(new URL(request.url).searchParams)
      const filter = registrationFilterSchema.parse(query)
      return json(
        registrationListSchema,
        backend.listRegistrations(params.organizationId!, params.eventId!, filter),
      )
    }),
  ),
  http.get(
    REGISTRATION,
    handle(({ backend, params }) =>
      json(
        registrationDetailSchema,
        backend.getRegistration(params.organizationId!, params.eventId!, params.registrationId!),
      ),
    ),
  ),
  http.post(
    `${REGISTRATION}/payments`,
    handle(({ backend, params, body }) =>
      json(
        registrationDetailSchema,
        backend.recordPayment(
          params.organizationId!,
          params.eventId!,
          params.registrationId!,
          body as PaymentInput,
        ),
        201,
      ),
    ),
  ),
]

const publicHandlers = [
  http.get(
    `${API}/public/events/:publicId`,
    handle(({ backend, params }) =>
      json(publicEventSchema, backend.getPublicEvent(params.publicId!)),
    ),
  ),
  http.post(
    `${API}/public/events/:publicId/registrations`,
    handle(({ backend, params, body }) => {
      const { isCreated, result } = backend.submitRegistration(
        params.publicId!,
        body as RegistrationInput,
      )
      return json(registrationResultSchema, result, isCreated ? 201 : 200)
    }),
  ),
]

const participantHandlers = [
  http.post(
    `${API}/participant/magic-links`,
    handle(({ backend, body }) =>
      json(magicLinkRequestedSchema, backend.requestMagicLink((body as { email: string }).email)),
    ),
  ),
  http.post(
    `${API}/participant/session`,
    handle(({ backend, body }) => {
      backend.openParticipantSession((body as { token: string }).token)
      return noContent()
    }),
  ),
  http.get(
    `${API}/participant/me`,
    handle(({ backend }) => json(participantSchema, backend.participantMe())),
  ),
  http.post(
    `${API}/participant/logout`,
    handle(({ backend }) => {
      backend.participantLogout()
      return noContent()
    }),
  ),
  http.get(
    `${API}/participant/registrations`,
    handle(({ backend }) =>
      json(participantRegistrationListSchema, {
        registrations: backend.participantRegistrations(),
      }),
    ),
  ),
  http.get(
    `${API}/participant/registrations/:registrationId`,
    handle(({ backend, params }) =>
      json(
        participantRegistrationSchema,
        backend.getParticipantRegistration(params.registrationId!),
      ),
    ),
  ),
]

/** All endpoints; a story installs them with `parameters.msw`. */
export const mockBackendHandlers = [
  ...authHandlers,
  ...organizerHandlers,
  ...publicHandlers,
  ...participantHandlers,
]

/** Paths for story-level overrides with `msw.use()`, e.g. a 500 for one endpoint. */
export const MOCK_API = {
  organizations: `${API}/organizations`,
  events: `${ORGANIZATION}/events`,
  event: EVENT,
  rooms: `${EVENT}/rooms`,
  registrations: `${EVENT}/registrations`,
  registration: REGISTRATION,
  publicEvent: `${API}/public/events/:publicId`,
  participantRegistrations: `${API}/participant/registrations`,
  participantRegistration: `${API}/participant/registrations/:registrationId`,
}
