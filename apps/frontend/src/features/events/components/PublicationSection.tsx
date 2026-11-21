import { FormError } from "@/components/FormError"
import { PageSection } from "@/components/PageSection"
import { Field, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"

import { PublicEventShare } from "@/features/events/components/PublicEventShare"

type PublicationSectionProps = {
  publicId: string
  isPublished: boolean
  isPending?: boolean
  errorMessage?: string | null
  onChange: (isPublished: boolean) => void
}

// Subsection "Veřejný katalog" of public event access (F54-1). The switch shows the saved
// state only, so a failed change leaves it where it was and a second click retries.
export function PublicationSection({
  publicId,
  isPublished,
  isPending = false,
  errorMessage = null,
  onChange,
}: PublicationSectionProps) {
  return (
    <PageSection title="Zveřejnění v katalogu">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Akce bude viditelná ve veřejném katalogu.
            </p>
            <p className="text-xs text-muted-foreground">
              Zveřejnění nemění dostupnost přihlašování.
            </p>
          </div>
          <Field
            orientation="horizontal"
            className="w-auto"
          >
            <FieldLabel
              htmlFor="event-published"
              className="sr-only"
            >
              Zveřejnit akci v katalogu
            </FieldLabel>
            <Switch
              id="event-published"
              checked={isPublished}
              disabled={isPending}
              onCheckedChange={onChange}
            />
          </Field>
        </div>
        {errorMessage ? <FormError message={errorMessage} /> : null}
        {isPublished ? (
          <div className="border-t border-border pt-4">
            <PublicEventShare publicId={publicId} />
          </div>
        ) : null}
      </div>
    </PageSection>
  )
}
