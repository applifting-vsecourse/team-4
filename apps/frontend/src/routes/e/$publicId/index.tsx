import { useQueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { CalendarX } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink"
import { LoadError } from "@/components/LoadError"
import { PublicShell } from "@/components/PublicShell"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { catalogEventQueryOptions } from "@/features/public-events/api/publicEventQueryOptions"
import { PublicEventDetail } from "@/features/public-events/components/PublicEventDetail"
import { toPublicEventDetail } from "@/features/public-events/lib/publicEventDetail"

// Veřejný katalog akcí → Detail akce (F55): published events only, whatever
// their registration status; no sign-in.
export const Route = createFileRoute("/e/$publicId/")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(catalogEventQueryOptions(params.publicId)),
  component: CatalogEventPage,
  errorComponent: CatalogEventErrorPage,
})

const BackToCatalog = () => (
  <BackLink
    to={ROUTES.catalog}
    className="mb-6"
  >
    Katalog akcí
  </BackLink>
)

const catalogLink = (
  <Button
    asChild
    variant="outline"
  >
    <Link to={ROUTES.catalog}>Zpět do katalogu</Link>
  </Button>
)

function CatalogEventPage() {
  const { publicId } = Route.useParams()
  const { data: event } = useSuspenseQuery(catalogEventQueryOptions(publicId))

  return (
    <PublicShell>
      <Seo title={event?.name ?? "Akce není dostupná"} />
      <BackToCatalog />
      {event ? (
        <PublicEventDetail {...toPublicEventDetail(publicId, event)} />
      ) : (
        // Unpublished, unknown and unavailable events look the same and show no event data.
        <RecordUnavailable
          title="Akce není dostupná"
          icon={CalendarX}
          action={catalogLink}
        />
      )}
    </PublicShell>
  )
}

// Loading failed (network, server): not presented as a missing event.
function CatalogEventErrorPage() {
  const router = useRouter()
  const { reset } = useQueryErrorResetBoundary()

  return (
    <PublicShell>
      <Seo title="Detail akce se nepodařilo načíst" />
      <BackToCatalog />
      <LoadError
        variant="page"
        title="Detail akce se nepodařilo načíst"
        onRetry={() => {
          reset()
          void router.invalidate()
        }}
        action={catalogLink}
      />
    </PublicShell>
  )
}
