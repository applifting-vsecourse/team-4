import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

// Card "Publikace" of the event settings (F54-1). Design only: shown in the
// Designs preview, not yet on the settings page or connected to the API.
export function PublicationSection() {
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
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="event-published">Zveřejnit ve veřejném katalogu</Label>
            <Switch id="event-published" />
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
