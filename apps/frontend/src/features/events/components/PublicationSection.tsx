import { TriangleAlert } from "lucide-react"

import { Alert, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type PublicationSectionProps = {
  isPublished: boolean
  isPending?: boolean
  errorMessage?: string | null
  onChange: (isPublished: boolean) => void
}

// Card "Publikace" of the event settings (F54-1). The switch shows the saved
// state only, so a failed change leaves it where it was and a second click retries.
export function PublicationSection({
  isPublished,
  isPending = false,
  errorMessage = null,
  onChange,
}: PublicationSectionProps) {
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
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="event-published">Zveřejnit ve veřejném katalogu</Label>
              <Switch
                id="event-published"
                checked={isPublished}
                disabled={isPending}
                onCheckedChange={onChange}
              />
            </div>
            {errorMessage ? (
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertTitle>{errorMessage}</AlertTitle>
              </Alert>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
