import { Fragment, type CSSProperties, type ReactNode } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { ChevronLeft, ClipboardList, LayoutDashboard, LogOut, Settings } from "lucide-react"

import { BrandMark } from "@/components/BrandMark"
import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"
import { PageHeader } from "@/components/PageHeader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"

import {
  RegistrationNeedsFields,
  type RegistrationNeedsErrors,
  type RegistrationNeedsValues,
} from "@/features/registrations/components/RegistrationNeedsFields"
import { RegistrationNeedsSummary } from "@/features/registrations/components/RegistrationNeedsSummary"

// F63 design preview: transport, diet and health data in a registration.
// Static only: no router links, queries or API; every value below is hard-coded.

const EVENT = "Víkendovky Modrá Hora – podzim 2026"
const ORGANIZATION = "Tábor Modrá Hora z. s."

const EMPTY: RegistrationNeedsValues = {
  transport: null,
  transportNote: "",
  hasNoDietRestriction: false,
  diet: [],
  dietNote: "",
  health: "",
}

const FILLED: RegistrationNeedsValues = {
  transport: "shared",
  transportNote: "Nastupovali bychom v Pardubicích u hlavního nádraží.",
  hasNoDietRestriction: false,
  diet: ["vegetarian", "lactoseFree"],
  dietNote: "Bez ořechů, syn je alergik.",
  health: "Astma, nosí s sebou inhalátor.\nPři zátěži potřebuje delší přestávky.",
}

const NO_RESTRICTION: RegistrationNeedsValues = { ...EMPTY, hasNoDietRestriction: true }

const TOO_LONG: RegistrationNeedsValues = {
  ...FILLED,
  transportNote: "Nastupovali bychom v Pardubicích u hlavního nádraží a rádi bychom jeli spolu.",
  health: "Dlouhý text zdravotních omezení, který překračuje povolenou délku pole.",
}

const TOO_LONG_ERRORS: RegistrationNeedsErrors = {
  transportNote: "Poznámka k dopravě může mít nejvýše 500 znaků.",
  dietNote: "Vlastní text ke stravě může mít nejvýše 500 znaků.",
  health: "Zdravotní omezení mohou mít nejvýše 2000 znaků.",
}

// --- Page shells -----------------------------------------------------------

// The participant frame, static: logo, theme, "Odhlásit se".
function ParticipantFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-4 px-4">
          <BrandMark isLarge />
          <div className="ml-auto flex items-center gap-2">
            <ThemeSwitcher />
            <Button
              variant="ghost"
              size="sm"
            >
              <LogOut />
              Odhlásit se
            </Button>
          </div>
        </div>
      </header>
      <main className="min-h-svh">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 md:py-12">{children}</div>
      </main>
    </>
  )
}

const BackButton = ({ label }: { label: string }) => (
  <Button
    variant="ghost"
    size="sm"
  >
    <ChevronLeft />
    {label}
  </Button>
)

const SIDEBAR_STYLE = { "--sidebar-width": "14rem" } as CSSProperties

const eventSections = [
  { label: "Přehled", icon: LayoutDashboard },
  { label: "Přihlášky", icon: ClipboardList, isActive: true },
  { label: "Nastavení", icon: Settings },
]

function OrganizationShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider style={SIDEBAR_STYLE}>
      <Sidebar>
        <SidebarHeader>
          <BrandMark isLarge />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {eventSections.map((section) => (
                <SidebarMenuItem key={section.label}>
                  <SidebarMenuButton isActive={section.isActive}>
                    <section.icon aria-hidden />
                    <span>{section.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <section className="mx-auto w-full max-w-5xl px-4 py-8 md:py-12">{children}</section>
      </SidebarInset>
    </SidebarProvider>
  )
}

const Crumbs = ({ trail }: { trail: string[] }) => (
  <Breadcrumb className="mb-4">
    <BreadcrumbList>
      {[ORGANIZATION, EVENT, ...trail.slice(0, -1)].map((item) => (
        <Fragment key={item}>
          <BreadcrumbItem>{item}</BreadcrumbItem>
          <BreadcrumbSeparator />
        </Fragment>
      ))}
      <BreadcrumbItem>
        <BreadcrumbPage>{trail.at(-1)}</BreadcrumbPage>
      </BreadcrumbItem>
    </BreadcrumbList>
  </Breadcrumb>
)

// Přihláška na akci, static: contact data, the F63 section and the submit.
type RegistrationPageProps = {
  values: RegistrationNeedsValues
  errors?: RegistrationNeedsErrors
  /** Saving failed: the error and a retry, all entered values kept. */
  errorMessage?: string
}

function RegistrationPage({ values, errors, errorMessage }: RegistrationPageProps) {
  return (
    <ParticipantFrame>
      <section className="space-y-6">
        <h1 className="text-h2">{EVENT}</h1>
        <form
          noValidate
          aria-label="Přihláška na akci"
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Kontaktní údaje</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="reg-first-name">Jméno</FieldLabel>
                    <Input
                      id="reg-first-name"
                      defaultValue="Jana"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="reg-last-name">Příjmení</FieldLabel>
                    <Input
                      id="reg-last-name"
                      defaultValue="Nováková"
                    />
                  </Field>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Doprava, strava a zdraví</CardTitle>
            </CardHeader>
            <CardContent>
              <RegistrationNeedsFields
                values={values}
                errors={errors}
              />
            </CardContent>
          </Card>
          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}
          <Button
            type="submit"
            size="lg"
            className="w-full sm:w-auto"
          >
            Odeslat přihlášku
          </Button>
        </form>
      </section>
    </ParticipantFrame>
  )
}

// Moje přihlášky → Detail přihlášky → Úprava přihlášky, static.
function ParticipantEditPage({ values }: { values: RegistrationNeedsValues }) {
  return (
    <ParticipantFrame>
      <section className="space-y-6">
        <BackButton label="Detail přihlášky" />
        <h1 className="text-h2">Úprava přihlášky</h1>
        <form
          noValidate
          aria-label="Úprava přihlášky"
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Doprava, strava a zdraví</CardTitle>
            </CardHeader>
            <CardContent>
              <RegistrationNeedsFields values={values} />
            </CardContent>
          </Card>
          <Button
            type="submit"
            size="lg"
            className="w-full sm:w-auto"
          >
            Zkontrolovat změny
          </Button>
        </form>
      </section>
    </ParticipantFrame>
  )
}

// Moje přihlášky → Detail přihlášky, static.
function ParticipantDetailPage({ values }: { values: RegistrationNeedsValues }) {
  return (
    <ParticipantFrame>
      <section className="space-y-6">
        <BackButton label="Moje přihlášky" />
        <h1 className="text-h2">{EVENT}</h1>
        <RegistrationNeedsSummary values={values} />
      </section>
    </ParticipantFrame>
  )
}

// Správa akce → Přihlášky → Detail přihlášky, static.
function OrganizerDetailPage({ values }: { values: RegistrationNeedsValues }) {
  return (
    <OrganizationShell>
      <PageHeader
        breadcrumb={<Crumbs trail={["Přihlášky", "Detail přihlášky"]} />}
        title="Jana Nováková"
        description={EVENT}
        actions={<Button variant="outline">Upravit přihlášku</Button>}
      />
      <RegistrationNeedsSummary values={values} />
    </OrganizationShell>
  )
}

// Správa akce → Přihlášky → Detail přihlášky → Úprava (organizer), static.
function OrganizerEditPage({ values }: { values: RegistrationNeedsValues }) {
  return (
    <OrganizationShell>
      <PageHeader
        breadcrumb={<Crumbs trail={["Přihlášky", "Detail přihlášky", "Úprava přihlášky"]} />}
        title="Jana Nováková"
        description={EVENT}
      />
      <form
        noValidate
        aria-label="Úprava přihlášky"
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Doprava, strava a zdraví</CardTitle>
          </CardHeader>
          <CardContent>
            <RegistrationNeedsFields values={values} />
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button type="submit">Uložit</Button>
          <Button variant="outline">Zrušit</Button>
        </div>
      </form>
    </OrganizationShell>
  )
}

const meta = {
  title: "Designs/F63 Transport, diet and health",
  component: RegistrationPage,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: { values: EMPTY },
} satisfies Meta<typeof RegistrationPage>

export default meta

type Story = StoryObj<typeof meta>

// The kit's destructive Alert description (`text-destructive/90`) is 4.3:1
// against the 4.5:1 AA minimum; this story reports it as a warning.
const contrastWarning = { a11y: { test: "todo" } }

/** Registration form: nothing filled in, the section is optional. */
export const RegistrationEmpty: Story = {}

/** Registration form: "Bez omezení" chosen, the other diet choices are unavailable. */
export const NoDietRestriction: Story = { args: { values: NO_RESTRICTION } }

/** Registration form: all three parts filled in, shared transport. */
export const RegistrationFilled: Story = { args: { values: FILLED } }

/** Invalid input: an error per field, everything entered is kept. */
export const ValidationErrors: Story = { args: { values: TOO_LONG, errors: TOO_LONG_ERRORS } }

/** Saving failed: the error above the button, the entered values kept. */
export const SaveFailed: Story = {
  parameters: contrastWarning,
  args: {
    values: FILLED,
    errorMessage:
      "Přihlášku se nepodařilo uložit. Údaje zůstaly zachované, zkuste to prosím znovu.",
  },
}

/** Participant editing the stored values (later changes go through F35-2a). */
export const ParticipantEdit: Story = {
  render: () => <ParticipantEditPage values={FILLED} />,
}

/** Participant detail with the stored values. */
export const ParticipantDetail: Story = {
  render: () => <ParticipantDetailPage values={FILLED} />,
}

/** Participant detail of an older registration: every part reads "Neuvedeno". */
export const ParticipantDetailNotProvided: Story = {
  render: () => <ParticipantDetailPage values={EMPTY} />,
}

/** Organizer detail of the same registration with the stored values. */
export const OrganizerDetail: Story = {
  render: () => <OrganizerDetailPage values={FILLED} />,
}

/** Organizer detail without the values: "Neuvedeno", not a confirmed absence. */
export const OrganizerDetailNotProvided: Story = {
  render: () => <OrganizerDetailPage values={EMPTY} />,
}

/** Organizer correcting the values of a registration. */
export const OrganizerEdit: Story = {
  render: () => <OrganizerEditPage values={FILLED} />,
}
