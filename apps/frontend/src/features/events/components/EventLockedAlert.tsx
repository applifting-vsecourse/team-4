import { Lock } from "lucide-react"

import { Notice } from "@/components/Notice"

import { type EventStatus } from "@/features/events/api/eventSchemas"

// The lock comes from the first opening and survives closing.
export function EventLockedAlert({ status }: { status: EventStatus }) {
  return (
    <Notice
      tone="info"
      icon={Lock}
      title={
        status === "closed"
          ? "Název, popis, místo, termíny a ceny zůstávají zamčené i po zavření přihlašování"
          : "Od otevření přihlašování jsou název, popis, místo, termíny a ceny zamčené"
      }
    />
  )
}
