export const ROUTES = {
  home: "/",
  forOrganizers: "/for-organizers",
  forParticipants: "/for-participants",
  organizations: "/organizations",
  newOrganization: "/organizations/new",
  organization: "/organizations/$organizationId",
  newEvent: "/organizations/$organizationId/events/new",
  event: "/organizations/$organizationId/events/$eventId",
  eventSettings: "/organizations/$organizationId/events/$eventId/settings",
  eventProgramme: "/organizations/$organizationId/events/$eventId/programme",
  eventRooms: "/organizations/$organizationId/events/$eventId/rooms",
  eventPayments: "/organizations/$organizationId/events/$eventId/payments",
  eventRegistrations: "/organizations/$organizationId/events/$eventId/registrations",
  registration: "/organizations/$organizationId/events/$eventId/registrations/$registrationId",
  editEvent: "/organizations/$organizationId/events/$eventId/edit",
  catalog: "/events",
  publicEvent: "/e/$publicId",
  publicRegistration: "/e/$publicId/registration",
  myRegistrations: "/my-registrations",
  myRegistration: "/my-registrations/$registrationId",
  myRegistrationEdit: "/my-registrations/$registrationId/edit",
  myProfile: "/my-profile",
  myNotifications: "/my-notifications",
  qrPayment: "/platba/$token",
  login: "/login",
  signup: "/signup",
  designSystem: "/design-system",
} as const

/** Sections a link can land on with the router's `hash`; the page gives the section this `id`. */
export const SECTIONS = {
  /** Participant's term states in their registration detail (S4-06). */
  registrationTerms: "terminy",
  /** Resolved change requests heading in the participant registration detail. */
  changeRequests: "zadosti-o-zmenu",
  /** Organizer's questions in the event registration form. */
  registrationQuestions: "registration-questions-heading",
  /** Platba card of the participant's registration detail (S5-02). */
  payment: "platba",
  /** Přijaté platby of the participant's registration detail (S4-06). */
  receivedPayments: "prijate-platby",
} as const
