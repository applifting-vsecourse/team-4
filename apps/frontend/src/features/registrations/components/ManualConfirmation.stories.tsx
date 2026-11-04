import type { CSSProperties, ReactNode } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  BarChart3,
  BedDouble,
  CalendarCog,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Mail,
  Settings,
} from "lucide-react"

import { BrandMark } from "@/components/BrandMark"
import { PageHeader } from "@/components/PageHeader"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

import {
  BulkConfirmationDialog,
  type BulkConfirmationDialogProps,
} from "@/features/registrations/components/BulkConfirmationDialog"
import {
  TermApprovalQueue,
  type ApprovalPerson,
  type ApprovalTerm,
  type TermApprovalQueueProps,
} from "@/features/registrations/components/TermApprovalQueue"
import {
  TermDecisionDialog,
  type TermDecisionDialogProps,
} from "@/features/registrations/components/TermDecisionDialog"
import { TermDecisions, type DecisionTerm } from "@/features/registrations/components/TermDecisions"

// F14-1 design preview: bulk confirmation of the proposal of one term and the
// decision per person. Static only: no router, queries or API; every value
// below is hard-coded.

const TERMS: ApprovalTerm[] = [
  { id: "turnus-1", label: "1. turnus", dates: "4.–11. 7. 2027" },
  { id: "turnus-2", label: "2. turnus", dates: "11.–18. 7. 2027" },
  { id: "turnus-3", label: "3. turnus", dates: "18.–25. 7. 2027" },
]

const NAMES = [
  "Tereza Nováková",
  "Jakub Svoboda",
  "Eliška Dvořáková",
  "Matěj Černý",
  "Anna Procházková",
  "Vojtěch Kučera",
  "Klára Veselá",
  "Ondřej Horák",
  "Barbora Králová",
  "Filip Němec",
  "Natálie Marková",
  "Šimon Pospíšil",
  "Adéla Havlíčková",
  "David Fiala",
  "Lucie Sedláčková",
  "Martin Doležal",
]

function person(
  index: number,
  suitability: ApprovalPerson["suitability"],
  state: ApprovalPerson["state"] = "pending",
): ApprovalPerson {
  return { id: `p-${index + 1}`, name: NAMES[index] ?? "", state, suitability }
}

// 11 suitable, 3 without capacity (waitlisted), 2 needing manual accommodation.
const SUITABLE = Array.from({ length: 11 }, (_, index) => person(index, "suitable"))
const REMAINING: ApprovalPerson[] = [
  person(11, "unsuitable", "waitlisted"),
  person(12, "unsuitable", "waitlisted"),
  person(13, "unsuitable", "waitlisted"),
  person(14, "manual"),
  person(15, "manual"),
]
const PEOPLE = [...SUITABLE, ...REMAINING]

const QUEUE: TermApprovalQueueProps = {
  terms: TERMS,
  selectedTermId: "turnus-1",
  isProposalCurrent: true,
  people: PEOPLE,
}

const BULK: Omit<BulkConfirmationDialogProps, "state"> = {
  isOpen: true,
  term: "1. turnus, 4.–11. 7. 2027",
  count: SUITABLE.length,
}

const DETAIL_TERMS: DecisionTerm[] = [
  { id: "turnus-1", label: "1. turnus", details: "4.–11. 7. 2027 · 4 800 Kč", state: "confirmed" },
  { id: "turnus-2", label: "2. turnus", details: "11.–18. 7. 2027 · 4 800 Kč", state: "pending" },
  {
    id: "turnus-3",
    label: "3. turnus",
    details: "18.–25. 7. 2027 · 4 800 Kč",
    state: "waitlisted",
  },
]

const SIDEBAR_STYLE = { "--sidebar-width": "14rem" } as CSSProperties

const eventSections = [
  { label: "Přehled", icon: LayoutDashboard },
  { label: "Přihlášky", icon: ClipboardList },
  { label: "Platby", icon: CreditCard },
  { label: "Ubytování", icon: BedDouble },
  { label: "Komunikace", icon: Mail },
  { label: "Nastavení", icon: Settings },
]

// The organization shell (sidebar + workspace) around the sections, static.
type ConfirmationPageProps = {
  /** The registration detail shows the person; the queue shows the event. */
  registrationOf?: string
  children: ReactNode
}

function ConfirmationPage({ registrationOf, children }: ConfirmationPageProps) {
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
                  <SidebarMenuButton isActive={section.label === "Přihlášky"}>
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
        <section className="mx-auto w-full max-w-5xl px-4 py-8 md:py-12">
          <PageHeader
            breadcrumb={
              <Breadcrumb className="mb-4">
                <BreadcrumbList>
                  <BreadcrumbItem>Junák – středisko Lipnice</BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>Akce a turnusy</BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>Letní tábor Lipnice 2027</BreadcrumbItem>
                  <BreadcrumbSeparator />
                  {registrationOf ? (
                    <>
                      <BreadcrumbItem>Přihlášky</BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>{registrationOf}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  ) : (
                    <BreadcrumbItem>
                      <BreadcrumbPage>Přihlášky</BreadcrumbPage>
                    </BreadcrumbItem>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            }
            title={registrationOf ?? "Letní tábor Lipnice 2027"}
            badge={registrationOf ? null : <Badge variant="success">Registrace otevřena</Badge>}
          />
          {children}
        </section>
      </SidebarInset>
    </SidebarProvider>
  )
}

const meta = {
  title: "Designs/F14-1 Manual confirmation",
  component: ConfirmationPage,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: { children: null },
} satisfies Meta<typeof ConfirmationPage>

export default meta

type Story = StoryObj<typeof meta>

function queue(props: Partial<TermApprovalQueueProps> = {}, dialog?: ReactNode): ReactNode {
  return (
    <>
      <TermApprovalQueue
        {...QUEUE}
        {...props}
      />
      {dialog}
    </>
  )
}

function detail(dialog?: Omit<TermDecisionDialogProps, "isOpen" | "person">): ReactNode {
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kontaktní údaje</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">E-mail</dt>
                <dd>tereza.novakova@seznam.cz</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Telefon</dt>
                <dd>+420 604 218 377</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <TermDecisions terms={DETAIL_TERMS} />
      </div>
      {dialog ? (
        <TermDecisionDialog
          isOpen
          person="Tereza Nováková"
          {...dialog}
        />
      ) : null}
    </>
  )
}

/** Current proposal of the term: 11 suitable, the bulk action and a decision menu per person. */
export const ApprovalQueue: Story = { args: { children: queue() } }

/** The one explicit confirmation of the term's proposal; the count is on the button. */
export const ConfirmAllSummary: Story = {
  args: {
    children: queue(
      {},
      <BulkConfirmationDialog
        {...BULK}
        state="review"
      />,
    ),
  },
}

/** The confirmation is being saved; a second click sends nothing. */
export const ConfirmAllSaving: Story = {
  args: {
    children: queue(
      {},
      <BulkConfirmationDialog
        {...BULK}
        state="saving"
      />,
    ),
  },
}

/** The re-check at execution failed: nothing was confirmed, a new proposal must be loaded. */
export const ConfirmAllStale: Story = {
  args: {
    children: queue(
      {},
      <BulkConfirmationDialog
        {...BULK}
        state="stale"
        staleReason="Návrh se změnil, nic nebylo potvrzeno."
      />,
    ),
  },
}

/** The write failed: states and payments are unchanged, the confirmation can be retried. */
export const ConfirmAllFailed: Story = {
  args: {
    children: queue(
      {},
      <BulkConfirmationDialog
        {...BULK}
        state="failed"
      />,
    ),
  },
}

/** After the confirmation: the result, and the people the proposal left waiting. */
export const ConfirmAllResult: Story = {
  args: {
    children: queue({
      people: REMAINING,
      confirmedResult: "V 1. turnusu je potvrzeno 11 účastí.",
    }),
  },
}

/** The proposal is stale: the bulk confirmation is off. */
export const StaleProposal: Story = { args: { children: queue({ isProposalCurrent: false }) } }

/** Nobody in the proposal is suitable: explained empty state, the bulk confirmation is off. */
export const NoSuitable: Story = {
  args: { children: queue({ selectedTermId: "turnus-2", people: REMAINING }) },
}

/** Registration detail: confirmed in one term, pending and waitlisted in the others. */
export const RegistrationDetail: Story = {
  args: { registrationOf: "Tereza Nováková", children: detail() },
}

/** Confirming one term from the detail. */
export const DecisionConfirm: Story = {
  args: {
    registrationOf: "Tereza Nováková",
    children: detail({ decision: "confirm", term: "2. turnus, 11.–18. 7. 2027" }),
  },
}

/** The re-check found no admissible capacity: the decision is not saved and the reason is shown. */
export const DecisionRejected: Story = {
  args: {
    registrationOf: "Tereza Nováková",
    children: detail({
      decision: "confirm",
      term: "3. turnus, 18.–25. 7. 2027",
      rejectedReason: "Ve 3. turnusu není volné přípustné místo.",
    }),
  },
}
