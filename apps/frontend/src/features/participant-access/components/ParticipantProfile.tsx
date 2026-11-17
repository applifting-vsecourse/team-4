import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"

import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { PageHeader } from "@/components/PageHeader"
import { Skeleton } from "@/components/ui/skeleton"

import { participantProfileQueryOptions } from "@/features/participant-access/api/participantQueryOptions"
import { ParticipantProfileForm } from "@/features/participant-access/components/ParticipantProfileForm"

type ParticipantProfileProps = {
  /** Shown instead when the session ended while the page was open. */
  sessionEnded: ReactNode
}

// Můj profil (S4-08): the optional personal details of the signed-in account,
// used to prefill the participant's next registration.
export function ParticipantProfile({ sessionEnded }: ParticipantProfileProps) {
  const query = useQuery(participantProfileQueryOptions())

  if (query.data === null) return sessionEnded

  return (
    <section className="space-y-6">
      <PageHeader title="Můj profil" />
      {query.data ? (
        // Another account starts its own form, never with the previous values.
        <ParticipantProfileForm
          key={query.data.email}
          profile={query.data}
        />
      ) : query.isError ? (
        <LoadError
          title="Profil se nepodařilo načíst"
          isRetrying={query.isFetching}
          onRetry={() => query.refetch()}
        />
      ) : (
        <LoadingBlock
          label="Načítání profilu"
          className="max-w-xl space-y-4"
        >
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </LoadingBlock>
      )}
    </section>
  )
}
