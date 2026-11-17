import { FormError } from "@/components/FormError"
import { Card, CardContent } from "@/components/ui/card"
import { CollapsibleSection } from "@/components/ui/collapsible-section"
import { Field, FieldLabel } from "@/components/ui/field"
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
    <CollapsibleSection
      headingId="publication-heading"
      title="Publikace"
    >
      <Card>
        <CardContent>
          <div className="space-y-4">
            <Field orientation="horizontal">
              <FieldLabel htmlFor="event-published">Zveřejnit ve veřejném katalogu</FieldLabel>
              <Switch
                id="event-published"
                checked={isPublished}
                disabled={isPending}
                onCheckedChange={onChange}
              />
            </Field>
            {errorMessage ? <FormError message={errorMessage} /> : null}
          </div>
        </CardContent>
      </Card>
    </CollapsibleSection>
  )
}
