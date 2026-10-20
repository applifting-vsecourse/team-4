export const ROUTES = {
  home: "/",
  organizations: "/organizations",
  newOrganization: "/organizations/new",
  organization: "/organizations/$organizationId",
  newEvent: "/organizations/$organizationId/events/new",
  event: "/organizations/$organizationId/events/$eventId",
  editEvent: "/organizations/$organizationId/events/$eventId/edit",
  publicEvent: "/e/$publicId",
  login: "/login",
  signup: "/signup",
  designSystem: "/design-system",
} as const
