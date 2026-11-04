import { useQueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { PublicShell } from "@/components/PublicShell"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { catalogEventQueryOptions } from "@/features/public-events/api/publicEventQueryOptions"
import { PublicEventDetail } from "@/features/public-events/components/PublicEventDetail"
import {
  PublicEventDetailError,
  PublicEventDetailUnavailable,
} from "@/features/public-events/components/PublicEventDetailStates"
import { toPublicEventDetail } from "@/features/public-events/lib/publicEventDetail"

// Veřejný katalog akcí → Detail akce (F55): published events only, whatever
// their registration status; no sign-in.
export const Route = createFileRoute("/e/$publicId/")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(catalogEventQueryOptions(params.publicId)),
  component: CatalogEventPage,
  errorComponent: CatalogEventErrorPage,
})

function BackToCatalog() {
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="mb-6"
    >
      <Link to={ROUTES.catalog}>
        <ArrowLeft aria-hidden />
        Katalog akcí
      </Link>
    </Button>
  )
}

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
        <PublicEventDetailUnavailable />
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
      <PublicEventDetailError
        onRetry={() => {
          reset()
          void router.invalidate()
        }}
      />
    </PublicShell>
  )
}
