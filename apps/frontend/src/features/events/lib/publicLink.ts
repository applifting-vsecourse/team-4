import { ROUTES } from "@/app/routes"

/** Full public link to the registration form; it depends only on the event's public id. */
export function publicRegistrationUrl(publicId: string) {
  return `${window.location.origin}${ROUTES.publicRegistration.replace("$publicId", publicId)}`
}
