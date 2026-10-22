import { Loader2, LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"

import { useParticipantLogout } from "@/features/participant-access/hooks/useParticipantLogout"

export function ParticipantLogoutButton() {
  const logout = useParticipantLogout()

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={logout.isPending}
      onClick={() => logout.mutate()}
    >
      {logout.isPending ? <Loader2 className="animate-spin" /> : <LogOut />}
      Odhlásit se
    </Button>
  )
}
