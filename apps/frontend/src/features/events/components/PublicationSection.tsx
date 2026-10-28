import { useState } from "react"
import { TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { readApiError } from "@/lib/apiError"

import { type EventDetail } from "@/features/events/api/eventSchemas"
import { useRefreshEvent } from "@/features/events/hooks/useEventMutations"
import { useUpdatePublication } from "@/features/events/hooks/useUpdatePublication"

type PublicationSectionProps = {
  organizationId: string
  event: EventDetail
}

// Card "Publikace" of the event settings (F54-1): lists the event in the
// public catalog or takes it down. The switch shows the saved state only, so
// a failed change never looks like a success. Registration is not affected.
export function PublicationSection({ organizationId, event }: PublicationSectionProps) {
  const publication = useUpdatePublication(organizationId, event.id)
  const refreshEvent = useRefreshEvent(organizationId, event.id)
  const [error, setError] = useState<string | null>(null)

  const handleChange = async (isPublished: boolean) => {
    setError(null)
    try {
      await publication.mutateAsync(isPublished)
      toast.success(
        isPublished ? "Akce je zveřejněná v katalogu." : "Akce byla stažena z katalogu.",
      )
    } catch (changeError) {
      const apiError = readApiError(changeError)
      if (apiError.status === 404) await refreshEvent()
      setError(
        apiError.status === 404
          ? "Záznam není dostupný."
          : "Změnu publikování se nepodařilo uložit. Zkuste to prosím znovu.",
      )
    }
  }

  return (
    <section aria-labelledby="publication-heading">
      <h2
        id="publication-heading"
        className="mb-4 text-h4"
      >
        Publikace
      </h2>
      <Card>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="event-published">Zveřejnit ve veřejném katalogu</Label>
                <p
                  id="event-published-state"
                  className="text-sm text-muted-foreground"
                >
                  {event.isPublished
                    ? "Návštěvníci akci najdou v katalogu akcí."
                    : "Akce v katalogu není. Přihláška zůstává dostupná přes veřejný odkaz."}
                </p>
              </div>
              <Switch
                id="event-published"
                aria-describedby="event-published-state"
                checked={event.isPublished}
                disabled={publication.isPending}
                onCheckedChange={handleChange}
              />
            </div>

            {error ? (
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertTitle>{error}</AlertTitle>
              </Alert>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
