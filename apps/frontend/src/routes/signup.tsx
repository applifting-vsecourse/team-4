import { useState } from "react"
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { AuthLayout } from "@/components/AuthLayout"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { SignUpForm } from "@/features/auth/components/SignUpForm"
import { useSignUp } from "@/features/auth/hooks/useSignUp"
import { AuthFailure } from "@/features/auth/lib/auth-errors"

export const Route = createFileRoute("/signup")({
  component: SignUpPage,
  loader: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions())
    if (!session) return
    throw redirect({ to: ROUTES.organizations })
  },
})

function SignUpPage() {
  const navigate = useNavigate()
  const signUp = useSignUp()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isEmailTaken, setIsEmailTaken] = useState(false)

  const handleSubmit = async (values: { name: string; email: string; password: string }) => {
    setErrorMessage(null)
    setIsEmailTaken(false)
    try {
      await signUp.mutateAsync(values)
      await navigate({ to: ROUTES.organizations })
    } catch (error) {
      setIsEmailTaken(error instanceof AuthFailure && error.code === "EMAIL_TAKEN")
      setErrorMessage(error instanceof Error ? error.message : "Registrace se nezdařila.")
    }
  }

  return (
    <>
      <Seo title="Registrace organizátora" />
      <AuthLayout
        title="Registrace organizátora"
        description="Vytvořte si účet. Organizaci založíte hned poté."
        footer={
          <>
            Už máte účet?{" "}
            <Link
              to={ROUTES.login}
              className="font-medium text-foreground underline underline-offset-4"
            >
              Přihlásit se
            </Link>
          </>
        }
      >
        <SignUpForm
          isLoading={signUp.isPending}
          errorMessage={errorMessage}
          onSubmit={handleSubmit}
        />
        {isEmailTaken ? (
          <Button
            asChild
            variant="outline"
            className="mt-4 w-full"
          >
            <Link to={ROUTES.login}>Přejít na přihlášení</Link>
          </Button>
        ) : null}
      </AuthLayout>
    </>
  )
}
