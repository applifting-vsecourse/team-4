import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { participantKeys } from "@/features/participant-access/api/participantQueryOptions"

export type OpenSessionStatus = "pending" | "opened" | "failed"

/**
 * Spends the link token once when the page opens; the server answers with the
 * session cookie. Not a mutation: StrictMode remounts the page and a mutation
 * observer would lose the in-flight request, leaving the page waiting forever.
 * The request is kept in a ref so a remount waits for the same one instead of
 * sending (and failing) a second time with an already spent link.
 */
export function useOpenSession(token: string | undefined): OpenSessionStatus {
  const queryClient = useQueryClient()
  const request = useRef<Promise<void> | null>(null)
  const [status, setStatus] = useState<OpenSessionStatus>(token ? "pending" : "failed")

  useEffect(() => {
    if (!token) return
    request.current ??= api
      .post("participant/session", { json: { token } })
      .then(() => queryClient.invalidateQueries({ queryKey: participantKeys.session() }))
      .then(() => undefined)

    let isCurrent = true
    request.current.then(
      () => {
        if (isCurrent) setStatus("opened")
      },
      () => {
        if (isCurrent) setStatus("failed")
      },
    )
    return () => {
      isCurrent = false
    }
  }, [token, queryClient])

  return token ? status : "failed"
}
