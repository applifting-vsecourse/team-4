export const ROUTES = {
  home: "/",
  organizations: "/organizations",
  newOrganization: "/organizations/new",
  organization: "/organizations/$organizationId",
  newEvent: "/organizations/$organizationId/events/new",
  event: "/organizations/$organizationId/events/$eventId",
  eventRooms: "/organizations/$organizationId/events/$eventId/rooms",
  editEvent: "/organizations/$organizationId/events/$eventId/edit",
  publicEvent: "/e/$publicId",
  login: "/login",
  signup: "/signup",
  designSystem: "/design-system",
} as const
