import { useState } from "react"
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { AuthLayout } from "@/components/AuthLayout"
import { Seo } from "@/components/Seo"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { SignInForm } from "@/features/auth/components/SignInForm"
import { useSignIn } from "@/features/auth/hooks/useSignIn"
import { decodeRedirectUri } from "@/features/auth/lib/redirect"

const loginSearchParamsSchema = z.object({
  from: z.string().optional(),
})

export const Route = createFileRoute("/login")({
  component: LoginPage,
  validateSearch: loginSearchParamsSchema,
  loader: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions())
    if (!session) return
    throw redirect({ to: ROUTES.quacks })
  },
})

function LoginPage() {
  const { from } = Route.useSearch()
  const redirectTo = from ? decodeRedirectUri(from) : ROUTES.quacks
  const navigate = useNavigate()
  const signIn = useSignIn()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (values: { email: string; password: string }) => {
    setErrorMessage(null)
    try {
      await signIn.mutateAsync(values)
      await navigate({ to: redirectTo })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Sign in failed")
    }
  }

  return (
    <>
      <Seo title="Sign in" />
      <AuthLayout
        title="Sign in"
        description="Welcome back to Quacker."
        footer={
          <>
            No account?{" "}
            <Link
              to={ROUTES.signup}
              className="font-medium text-foreground underline underline-offset-4"
            >
              Sign up
            </Link>
          </>
        }
      >
        <SignInForm
          isLoading={signIn.isPending}
          errorMessage={errorMessage}
          onSubmit={handleSubmit}
        />
      </AuthLayout>
    </>
  )
}
