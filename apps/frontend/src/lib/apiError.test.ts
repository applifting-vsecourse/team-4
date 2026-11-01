import ky from "ky"
import { describe, expect, it } from "vitest"

import { readApiError } from "@/lib/apiError"

// A real ky client, so the error is the one the app gets: ky reads the error
// body itself and exposes it as `error.data`.
async function failWith(status: number, body: unknown): Promise<unknown> {
  const client = ky.create({
    retry: { limit: 0 },
    fetch: () =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { "content-type": "application/json" },
        }),
      ),
  })
  try {
    await client.get("http://localhost/test")
  } catch (error) {
    return error
  }
  throw new Error("the request did not fail")
}

describe("readApiError", () => {
  it("reads the code, field and message of an API error", async () => {
    const error = await failWith(409, {
      statusCode: 409,
      code: "room_label_taken",
      field: "label",
      message: "Pokoj s tímto označením už v akci existuje.",
    })
    expect(readApiError(error)).toEqual({
      status: 409,
      code: "room_label_taken",
      field: "label",
      message: "Pokoj s tímto označením už v akci existuje.",
      conflicts: [],
    })
  })

  it("keeps the status when the body has no code", async () => {
    expect(readApiError(await failWith(500, { message: "x" }))).toMatchObject({
      status: 500,
      code: null,
    })
  })

  it("is empty for something that is not an HTTP error", () => {
    expect(readApiError(new Error("offline"))).toEqual({
      status: null,
      code: null,
      field: null,
      message: null,
      conflicts: [],
    })
  })

  it("reads the terms of a refused capacity change", async () => {
    const conflicts = [
      { termId: "t1", termLabel: "Turnus 1", proposedCapacity: 2, confirmedParticipants: 3 },
    ]
    expect(
      readApiError(await failWith(409, { code: "capacity_below_confirmed", conflicts })).conflicts,
    ).toEqual(conflicts)
    expect(readApiError(await failWith(409, { conflicts: [{ termId: 1 }] })).conflicts).toEqual([])
  })
})
