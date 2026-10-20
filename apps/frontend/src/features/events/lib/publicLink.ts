import { ROUTES } from "@/app/routes"

/** Full public link of an event; it depends only on the event's public id. */
export function publicEventUrl(publicId: string) {
  return `${window.location.origin}${ROUTES.publicEvent.replace("$publicId", publicId)}`
}
