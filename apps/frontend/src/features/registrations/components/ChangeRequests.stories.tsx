import { Fragment, type CSSProperties, type ReactNode } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  BarChart3,
  BedDouble,
  CalendarCog,
  Check,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Mail,
  Settings,
  TriangleAlert,
  X,
} from "lucide-react"

import { BrandMark } from "@/components/BrandMark"
import { PageHeader } from "@/components/PageHeader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { type RegistrationDetail as Detail } from "@/features/registrations/api/eventRegistrationSchemas"
import {
  ChangeRequestCard,
  type ChangeRequestCardProps,
} from "@/features/registrations/components/ChangeRequestCard"
import {
  ChangeRequestsTable,
  type PendingChangeRequest,
} from "@/features/registrations/components/ChangeRequestsTable"
import { RegistrationDetail } from "@/features/registrations/components/RegistrationDetail"

// F35-2a design preview, organizer side: the change requests of an event and
// the decision on one of them in the registration detail.
// Static only: no router links, queries or API; every value below is hard-coded.

const ORGANIZATION = "Tábor Modrá Hora z. s."
const EVENT = "Víkendovky Modrá Hora – podzim 2026"
const LOCATION = "Tábořiště Modrá Hora, Horní Lhota 12, 539 01 Hlinsko"

const T1 = { id: "turnus-1", label: "Turnus 1", dates: "6. 11. – 8. 11. 2026", price: "2 400 Kč" }
const T3 = { id: "turnus-3", label: "Turnus 3", dates: "4. 12. – 6. 12. 2026", price: "2 900 Kč" }

const REQUESTS: PendingChangeRequest[] = [
  {
    id: "zadost-1",
    participant: "Jana Nováková",
    email: "jana.novakova@seznam.cz",
    kind: "Přesun termínu",
    terms: "Turnus 1 → Turnus 3",
    submittedAt: "30. 10. 2026 14:05",
  },
  {
    id: "zadost-2",
    participant: "Tomáš Dvořák",
    email: "tomas.dvorak@email.cz",
    kind: "Úprava údajů",
    terms: "Turnus 1",
    submittedAt: "30. 10. 2026 16:40",
  },
  {
    id: "zadost-3",
    participant: "Eliška Procházková",
    email: "eliska.prochazkova@centrum.cz",
    kind: "Odhlášení přihlášky",
    terms: "Turnus 1, Turnus 2",
    submittedAt: "31. 10. 2026 8:15",
  },
]

const MOVE_REQUEST: ChangeRequestCardProps = {
  status: "pending",
  kind: "Přesun termínu",
  submittedAt: "30. 10. 2026 14:05",
  summary: {
    terms: [
      { ...T1, original: "confirmed", proposed: "cancelled" },
      { ...T3, original: null, proposed: "confirmed" },
    ],
    money: [
      { label: "K úhradě za potvrzené termíny", original: "4 800 Kč", proposed: "5 300 Kč" },
      { label: "Zaplaceno", original: "4 800 Kč", proposed: "4 800 Kč" },
      { label: "Zbývá zaplatit", original: "0 Kč", proposed: "500 Kč" },
    ],
  },
}

// The valid registration, shown under the request by the live detail (S2-11).
const BASE: Omit<Detail, "terms"> = {
  id: "8d1f6a52-3c1e-4b8f-9d2a-6f1e2b3c4d5e",
  receivedAt: "2026-10-05T08:30:00Z",
  firstName: "Jana",
  lastName: "Nováková",
  email: "jana.novakova@seznam.cz",
  phone: "+420 604 123 456",
  selectedPriceMinor: 480000,
  amountDueMinor: 480000,
  paidMinor: 480000,
  balanceMinor: 0,
  paymentState: "paid",
  reminderAt: null,
  variableSymbol: "2026110412",
  payments: [
    { id: "4b9c2d1e-7a6f-4e3d-8c2b-1a0f9e8d7c6b", receivedOn: "2026-10-12", amountMinor: 480000 },
  ],
}

const TERM_1 = {
  termId: "1a2b3c4d-0000-4000-8000-000000000001",
  label: "Turnus 1",
  startDate: "2026-11-06",
  endDate: "2026-11-08",
  priceMinor: 240000,
  status: "confirmed" as const,
}
const TERM_2 = {
  termId: "1a2b3c4d-0000-4000-8000-000000000002",
  label: "Turnus 2",
  startDate: "2026-11-20",
  endDate: "2026-11-22",
  priceMinor: 240000,
  status: "confirmed" as const,
}
const TERM_3 = {
  termId: "1a2b3c4d-0000-4000-8000-000000000003",
  label: "Turnus 3",
  startDate: "2026-12-04",
  endDate: "2026-12-06",
  priceMinor: 290000,
  status: "confirmed" as const,
}

const ORIGINAL: Detail = { ...BASE, terms: [TERM_1, TERM_2] }

const AFTER_APPROVAL: Detail = {
  ...BASE,
  terms: [TERM_2, TERM_3],
  selectedPriceMinor: 530000,
  amountDueMinor: 530000,
  balanceMinor: 50000,
  paymentState: "partial",
  reminderAt: "2026-11-03T09:00:00Z",
}

const UPDATED_AT = Date.parse("2026-10-31T08:10:00Z")

const SIDEBAR_STYLE = { "--sidebar-width": "14rem" } as CSSProperties

const eventSections = [
  { label: "Přehled", icon: LayoutDashboard },
  { label: "Přihlášky", icon: ClipboardList, isActive: true },
  { label: "Platby", icon: CreditCard },
  { label: "Ubytování", icon: BedDouble },
  { label: "Komunikace", icon: Mail },
  { label: "Nastavení", icon: Settings },
]

// The organization shell (sidebar + workspace) of the Přihlášky pages, static.
function OrganizationShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider style={SIDEBAR_STYLE}>
      <Sidebar>
        <SidebarHeader>
          <BrandMark isLarge />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Organizace</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <CalendarCog />
                  <span>Akce a turnusy</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton disabled>
                  <BarChart3 aria-hidden />
                  <span>Reporty</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Akce</SidebarGroupLabel>
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
      {[ORGANIZATION, "Akce a turnusy", EVENT, ...trail.slice(0, -1)].map((item) => (
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

// Správa akce → Přihlášky with the Ke schválení tab open.
function RequestsPage({ requests }: { requests: PendingChangeRequest[] }) {
  return (
    <OrganizationShell>
      <PageHeader
        breadcrumb={<Crumbs trail={["Přihlášky"]} />}
        title={EVENT}
        badge={<Badge variant="success">Registrace otevřena</Badge>}
        description={LOCATION}
      />
      <Tabs defaultValue="approvals">
        <TabsList>
          <TabsTrigger value="list">Seznam přihlášek</TabsTrigger>
          <TabsTrigger value="approvals">
            Ke schválení
            {requests.length > 0 ? <Badge variant="secondary">{requests.length}</Badge> : null}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="approvals">
          <section
            aria-labelledby="approvals-heading"
            className="space-y-4 pt-4"
          >
            <h2
              id="approvals-heading"
              className="text-h4"
            >
              Ke schválení
            </h2>
            <ChangeRequestsTable requests={requests} />
          </section>
        </TabsContent>
      </Tabs>
    </OrganizationShell>
  )
}

// Správa akce → Přihlášky → Ke schválení → Detail přihlášky.
type RequestDetailPageProps = {
  request: ChangeRequestCardProps
  registration: Detail
  /** Approving is refused, e.g. the target term filled up. */
  isApproveDisabled?: boolean
}

function RequestDetailPage({ request, registration, isApproveDisabled }: RequestDetailPageProps) {
  const actions =
    request.status === "pending" ? (
      <>
        <Button variant="outline">
          <X />
          Zamítnout
        </Button>
        <Button disabled={isApproveDisabled}>
          <Check />
          Schválit
        </Button>
      </>
    ) : undefined

  return (
    <OrganizationShell>
      <PageHeader
        breadcrumb={<Crumbs trail={["Přihlášky", "Ke schválení", "Detail přihlášky"]} />}
        title={`${registration.firstName} ${registration.lastName}`}
        description={EVENT}
      />
      <div className="space-y-6">
        <ChangeRequestCard
          {...request}
          actions={actions}
        />
        <section
          aria-labelledby="registration-heading"
          className="space-y-4"
        >
          <h2
            id="registration-heading"
            className="text-h4"
          >
            Platná přihláška
          </h2>
          <RegistrationDetail
            registration={registration}
            updatedAt={UPDATED_AT}
            isRefreshing={false}
            hasRefreshFailed={false}
            onRefresh={() => undefined}
          />
        </section>
      </div>
    </OrganizationShell>
  )
}

const meta = {
  title: "Designs/F35-2a Change requests",
  component: RequestDetailPage,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: { request: MOVE_REQUEST, registration: ORIGINAL },
} satisfies Meta<typeof RequestDetailPage>

export default meta

type Story = StoryObj<typeof meta>

// The kit's destructive Alert description (`text-destructive/90`) is 4.3:1
// against the 4.5:1 AA minimum; these stories report it as a warning.
const contrastWarning = { a11y: { test: "todo" } }

/** Pending requests of this event, oldest first. */
export const Queue: Story = { render: () => <RequestsPage requests={REQUESTS} /> }

/** No request waits for a decision. */
export const EmptyQueue: Story = { render: () => <RequestsPage requests={[]} /> }

/** One request: original and proposed values, terms and price; approve or reject. */
export const Pending: Story = {}

/** The decision failed: the error and a retry, the request stays pending. */
export const DecisionFailed: Story = {
  parameters: contrastWarning,
  args: {
    request: {
      ...MOVE_REQUEST,
      notice: (
        <Alert variant="destructive">
          <AlertDescription>
            Rozhodnutí se nepodařilo uložit. Zkuste to prosím znovu.
          </AlertDescription>
        </Alert>
      ),
    },
  },
}

/** Capacity re-checked on approval: Turnus 3 filled up, approving waits for the participant. */
export const CapacityChanged: Story = {
  args: {
    isApproveDisabled: true,
    request: {
      ...MOVE_REQUEST,
      notice: (
        <Alert>
          <TriangleAlert />
          <AlertTitle>
            Turnus 3 se mezitím zaplnil. Přesun lze schválit až po novém souhlasu účastníka.
          </AlertTitle>
        </Alert>
      ),
    },
  },
}

/** Approved once: the registration shows the result, nothing more to decide. */
export const Approved: Story = {
  args: {
    request: { ...MOVE_REQUEST, status: "approved", decidedAt: "31. 10. 2026 9:12" },
    registration: AFTER_APPROVAL,
  },
}

/** Rejected: the request stays visible and the registration is unchanged. */
export const Rejected: Story = {
  args: {
    request: { ...MOVE_REQUEST, status: "rejected", decidedAt: "31. 10. 2026 9:12" },
  },
}
