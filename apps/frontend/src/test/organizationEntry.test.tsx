import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import { Route } from "@/routes/_ProtectedPages/organizations/index"

const alfa = { id: "org-a", name: "Alfa" }
const beta = { id: "org-b", name: "Beta" }

async function enter(organizations: { id: string; name: string }[]) {
  const queryClient = new QueryClient()
  vi.spyOn(queryClient, "fetchQuery").mockResolvedValue(organizations)
  const loader = Route.options.loader
  if (typeof loader !== "function") throw new Error("Missing entry loader")
  return await (loader({ context: { queryClient } } as Parameters<
    typeof loader
  >[0]) as Promise<unknown>)
}

describe("organization entry", () => {
  it("opens the only organization", async () => {
    await expect(enter([alfa])).rejects.toMatchObject({
      options: { to: "/organizations/$organizationId", params: { organizationId: alfa.id } },
    })
  })

  it("returns every organization for the chooser even with a remembered choice", async () => {
    localStorage.setItem("akcio:last-organization:user", beta.id)
    await expect(enter([alfa, beta])).resolves.toEqual([alfa, beta])
    localStorage.clear()
  })

  it("returns no organizations for the existing creation empty state", async () => {
    await expect(enter([])).resolves.toEqual([])
  })
})
