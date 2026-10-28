// The organizer signed in for previews. BetterAuth's `get-session` answer has
// no zod schema in the app; the client reads only `user`.

export const ORGANIZER = {
  id: "0190c0de-0000-7000-8000-000000000001",
  email: "petra.kralova@example.cz",
  name: "Petra Králová",
  username: "petra.kralova",
  emailVerified: true,
  image: null,
  createdAt: "2027-01-10T08:00:00.000Z",
  updatedAt: "2027-01-10T08:00:00.000Z",
}

export const ORGANIZER_SESSION = {
  session: {
    id: "0190c0de-0000-7000-8000-000000000002",
    userId: ORGANIZER.id,
    token: "preview-session",
    expiresAt: "2099-01-01T00:00:00.000Z",
    createdAt: "2027-03-01T08:00:00.000Z",
    updatedAt: "2027-03-01T08:00:00.000Z",
    ipAddress: null,
    userAgent: null,
  },
  user: ORGANIZER,
}
