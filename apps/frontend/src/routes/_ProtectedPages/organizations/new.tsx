import { useState } from "react"
import { createFileRoute, useRouter } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink"
import { PageHeader } from "@/components/PageHeader"
import { Seo } from "@/components/Seo"
import { Card, CardContent } from "@/components/ui/card"
import { WorkspacePage } from "@/components/WorkspacePage"
import { HTTPError } from "@/lib/api-client"

import { OrganizationForm } from "@/features/organizations/components/OrganizationForm"
import { useCreateOrganization } from "@/features/organizations/hooks/useCreateOrganization"

export const Route = createFileRoute("/_ProtectedPages/organizations/new")({
  component: NewOrganizationPage,
})

function NewOrganizationPage() {
  const router = useRouter()
  const createOrganization = useCreateOrganization()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  const handleSubmit = async (values: { name: string }) => {
    setErrorMessage(null)
    setNameError(null)
    try {
      const organization = await createOrganization.mutateAsync(values)
      await router.navigate({ href: `/organizations/${organization.id}/` })
    } catch (error) {
      if (error instanceof HTTPError && error.response.status === 409) {
        setNameError("Organizace s tímto názvem už existuje.")
        return
      }
      setErrorMessage("Organizaci se nepodařilo založit. Zkuste to prosím znovu.")
    }
  }

  return (
    <WorkspacePage>
      <Seo title="Založit organizaci" />
      <BackLink
        to={ROUTES.organizations}
        className="mb-2"
      >
        Zpět na seznam organizací
      </BackLink>
      <Card className="mx-auto w-full max-w-md">
        <CardContent>
          <PageHeader
            title="Založit organizaci"
            description="Stačí název. Organizace bude vaše a otevře se její seznam akcí."
          />
          <OrganizationForm
            isLoading={createOrganization.isPending}
            errorMessage={errorMessage}
            nameError={nameError}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>
    </WorkspacePage>
  )
}
