import { ROUTES } from "@/app/routes"
import { env } from "@/config/env"

/** Full public link to the registration form; it depends only on the event's public id. */
export function publicRegistrationUrl(publicId: string) {
  return `${window.location.origin}${ROUTES.publicRegistration.replace("$publicId", publicId)}`
}

/** Full public link that carries preview metadata and opens the event detail. */
export function publicEventShareUrl(publicId: string) {
  return `${env.VITE_API_URL}/public/catalog/events/${encodeURIComponent(publicId)}/share`
}
