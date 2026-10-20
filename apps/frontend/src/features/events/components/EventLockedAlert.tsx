import { Lock } from "lucide-react"

import { Alert, AlertTitle } from "@/components/ui/alert"

import { type EventStatus } from "@/features/events/api/eventSchemas"

// The lock comes from the first opening and survives closing (E6, E7).
export function EventLockedAlert({ status }: { status: EventStatus }) {
  return (
    <Alert>
      <Lock />
      <AlertTitle>
        {status === "closed"
          ? "Název, popis, místo, termíny a ceny zůstávají zamčené i po zavření přihlašování"
          : "Od otevření přihlašování jsou název, popis, místo, termíny a ceny zamčené"}
      </AlertTitle>
    </Alert>
  )
}
