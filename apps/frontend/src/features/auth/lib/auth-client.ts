import { usernameClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

import { env } from "@/config/env"

export const authClient = createAuthClient({
  baseURL: env.VITE_BETTER_AUTH_URL,
  plugins: [usernameClient()],
})
