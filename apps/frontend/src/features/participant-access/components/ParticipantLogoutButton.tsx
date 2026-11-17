import { LogOut } from "lucide-react"

import { PendingButton } from "@/components/PendingButton"

import { useParticipantLogout } from "@/features/participant-access/hooks/useParticipantLogout"

export function ParticipantLogoutButton() {
  const logout = useParticipantLogout()

  return (
    <PendingButton
      variant="ghost"
      size="sm"
      isPending={logout.isPending}
      icon={<LogOut />}
      onClick={() => logout.mutate()}
    >
      Odhlásit se
    </PendingButton>
  )
}
