import { delay, http, HttpResponse, type HttpHandler } from "msw"

import { env } from "@/config/env"
import type { ApiErrorCode } from "@/lib/apiError"

// Building blocks for the states of screen stories. A story prepends one of
// these with `msw.use()` in its `beforeEach`; the rest of the backend comes
// from the meta's handlers.

type Method = "get" | "post" | "put" | "patch" | "delete"

type ApiErrorBody = {
  code?: ApiErrorCode
  message?: string
  field?: string
  conflicts?: unknown[]
  /** A refused registration change sends the current preview back (F35-2a). */
  preview?: unknown
}

/** Absolute URL of an API path; MSW `:params` are kept. */
export const apiUrl = (path: string) => `${env.VITE_API_URL}${path}`

/** An error response in the shape `readApiError` reads. */
export const apiError = (status: number, body: ApiErrorBody = {}) =>
  HttpResponse.json({ statusCode: status, ...body }, { status })

/** The request fails: 500 unless told otherwise, with an optional code and message. */
export const failOn = (
  method: Method,
  path: string,
  status = 500,
  body?: ApiErrorBody,
): HttpHandler[] => [http[method](apiUrl(path), () => apiError(status, body))]

/**
 * The first request answers with `body`, every later one fails with 500: the
 * screen loads, then a refresh fails while the loaded data stays shown.
 */
export const failsOnRefresh = (method: Method, path: string, body: unknown): HttpHandler[] => {
  let calls = 0
  return [
    http[method](apiUrl(path), () =>
      calls++ === 0 ? HttpResponse.json(body as never) : apiError(500),
    ),
  ]
}

/** The request never answers, so the screen stays in its loading state. */
export const neverAnswer = (method: Method, path: string): HttpHandler[] => [
  http[method](apiUrl(path), async () => {
    await delay("infinite")
    return HttpResponse.json(null)
  }),
]
