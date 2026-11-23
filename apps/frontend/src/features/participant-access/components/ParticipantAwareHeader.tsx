import { useQuery } from "@tanstack/react-query"

import { Header } from "@/components/Header/Header"

import { participantSessionQueryOptions } from "@/features/participant-access/api/participantQueryOptions"
import { ParticipantAccountMenu } from "@/features/participant-access/components/ParticipantAccountMenu"

/** The shared public and participant header, backed by the participant session cache. */
export function ParticipantAwareHeader({
  variant = "public",
}: {
  variant?: "public" | "participant"
}) {
  const session = useQuery(participantSessionQueryOptions())

  return (
    <Header
      variant={variant}
      account={session.data ? <ParticipantAccountMenu email={session.data.email} /> : undefined}
      isAccountLoading={session.isPending}
    />
  )
}
