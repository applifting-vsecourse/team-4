import { useQuery } from "@tanstack/react-query"

import { catalogListQueryOptions } from "@/features/public-events/api/publicEventQueryOptions"
import { toCatalogPreview } from "@/features/public-events/lib/catalogList"

/**
 * The landing preview of the public catalog. Not suspending: the page around
 * the preview renders while it loads or fails.
 */
export function useCatalogPreview() {
  return useQuery({ ...catalogListQueryOptions(), select: toCatalogPreview })
}
