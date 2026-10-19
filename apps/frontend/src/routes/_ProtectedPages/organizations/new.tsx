import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"
import { HTTPError } from "@/lib/api-client"

import { useSession } from "@/features/auth/hooks/useSession"
import { OrganizationForm } from "@/features/organizations/components/OrganizationForm"
import { useCreateOrganization } from "@/features/organizations/hooks/useCreateOrganization"
import { rememberOrganization } from "@/features/organizations/lib/lastOrganization"

export const Route = createFileRoute("/_ProtectedPages/organizations/new")({
  component: NewOrganizationPage,
})

function NewOrganizationPage() {
  const navigate = useNavigate()
  const { user } = useSession()
  const createOrganization = useCreateOrganization()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  const handleSubmit = async (values: { name: string }) => {
    setErrorMessage(null)
    setNameError(null)
    try {
      const organization = await createOrganization.mutateAsync(values)
      if (user) rememberOrganization(user.id, organization.id)
      await navigate({
        to: "/organizations/$organizationId",
        params: { organizationId: organization.id },
      })
    } catch (error) {
      if (error instanceof HTTPError && error.response.status === 409) {
        setNameError("Organizace s tímto názvem už existuje.")
        return
      }
      setErrorMessage("Organizaci se nepodařilo založit. Zkuste to prosím znovu.")
    }
  }

  return (
    <section className="mx-auto w-full max-w-sm px-4 py-16">
      <Seo title="Založit organizaci" />
      <h1 className="text-h2">Založit organizaci</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Stačí název. Organizace bude vaše a otevře se její seznam akcí.
      </p>
      <div className="mt-8">
        <OrganizationForm
          isLoading={createOrganization.isPending}
          errorMessage={errorMessage}
          nameError={nameError}
          onSubmit={handleSubmit}
        />
      </div>
    </section>
  )
}
