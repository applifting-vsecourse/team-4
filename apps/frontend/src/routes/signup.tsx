import { useState } from "react"
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { AuthLayout } from "@/components/AuthLayout"
import { Seo } from "@/components/Seo"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { SignUpForm } from "@/features/auth/components/SignUpForm"
import { useSignUp } from "@/features/auth/hooks/useSignUp"

export const Route = createFileRoute("/signup")({
  component: SignUpPage,
  loader: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions())
    if (!session) return
    throw redirect({ to: ROUTES.quacks })
  },
})

function SignUpPage() {
  const navigate = useNavigate()
  const signUp = useSignUp()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (values: {
    email: string
    name: string
    username: string
    password: string
  }) => {
    setErrorMessage(null)
    try {
      await signUp.mutateAsync({
        email: values.email,
        password: values.password,
        name: values.name,
        username: values.username,
      })
      await navigate({ to: ROUTES.quacks })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Sign up failed")
    }
  }

  return (
    <>
      <Seo title="Sign up" />
      <AuthLayout
        title="Sign up"
        description="Create your Quacker account."
        footer={
          <>
            Already have an account?{" "}
            <Link
              to={ROUTES.login}
              className="font-medium text-foreground underline underline-offset-4"
            >
              Sign in
            </Link>
          </>
        }
      >
        <SignUpForm
          isLoading={signUp.isPending}
          errorMessage={errorMessage}
          onSubmit={handleSubmit}
        />
      </AuthLayout>
    </>
  )
}
