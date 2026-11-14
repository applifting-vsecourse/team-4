import { getResponse } from "msw"
import { describe, expect, it } from "vitest"

import { apiError, apiUrl, failOn, failsOnRefresh } from "@/screens/msw"

describe("screen story MSW helpers", () => {
  it("answers in the API's error shape, which readApiError reads", async () => {
    const response = apiError(409, { code: "proposal_stale", message: "x" })

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      statusCode: 409,
      code: "proposal_stale",
      message: "x",
    })
  })

  it("fails one request of the API with 500 by default", async () => {
    const response = await getResponse(
      failOn("get", "/organizations/:organizationId"),
      new Request(apiUrl("/organizations/org-1")),
    )

    expect(response?.status).toBe(500)
  })

  it("answers the first request, then fails every refresh", async () => {
    const handlers = failsOnRefresh("get", "/a", { ok: true })
    const first = await getResponse(handlers, new Request(apiUrl("/a")))
    const second = await getResponse(handlers, new Request(apiUrl("/a")))

    expect(await first?.json()).toEqual({ ok: true })
    expect(second?.status).toBe(500)
  })

  it("leaves other methods of the same path alone", async () => {
    const response = await getResponse(
      failOn("put", "/organizations/:organizationId"),
      new Request(apiUrl("/organizations/org-1")),
    )

    expect(response).toBeUndefined()
  })
})
