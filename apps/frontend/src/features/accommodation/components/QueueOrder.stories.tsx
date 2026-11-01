import { Fragment, type CSSProperties, type ReactNode } from "react"
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
import { expect, screen, waitFor } from "storybook/test"

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
  QueueHistoryList,
  type QueueHistoryEntry,
} from "@/features/accommodation/components/QueueHistoryList"
import { QueueHistoryRegistrationCard } from "@/features/accommodation/components/QueueHistoryRegistrationCard"
import {
  QueueOrderConfirmDialog,
  type QueueOrderConfirmDialogProps,
} from "@/features/accommodation/components/QueueOrderConfirmDialog"
import {
  QueueOrderDetail,
  type QueueOrderPerson,
} from "@/features/accommodation/components/QueueOrderDetail"
import {
  QueueOrderMoveDialog,
  type QueueOrderMoveDialogProps,
} from "@/features/accommodation/components/QueueOrderMoveDialog"

// F39-1 design preview: queue order detail, manual move with a reason and the
// immutable history. Static only: no router, queries or API; all values are
// hard-coded.

const QUEUE = "1. turnus · Fronta Žena"

const PEOPLE: QueueOrderPerson[] = [
  {
    id: "p1",
    position: 1,
    name: "Tereza Nováková",
    state: "pending",
    receivedAt: "2. 3. 2027 18:41",
  },
  {
    id: "p2",
    position: 2,
    name: "Eliška Dvořáková",
    state: "pending",
    receivedAt: "2. 3. 2027 19:05",
  },
  {
    id: "p3",
    position: 3,
    name: "Anna Procházková",
    state: "pending",
    receivedAt: "3. 3. 2027 8:12",
  },
  {
    id: "p4",
    position: 4,
    name: "Klára Veselá",
    state: "waitlisted",
    receivedAt: "3. 3. 2027 9:30",
  },
  {
    id: "p5",
    position: 5,
    name: "Kateřina Marková",
    state: "waitlisted",
    receivedAt: "4. 3. 2027 12:47",
  },
  {
    id: "p6",
    position: 6,
    name: "Lucie Horáková",
    state: "waitlisted",
    receivedAt: "5. 3. 2027 20:18",
  },
  { id: "c1", name: "Markéta Králová", state: "confirmed", receivedAt: "1. 3. 2027 10:02" },
  { id: "c2", name: "Petra Novotná", state: "confirmed", receivedAt: "1. 3. 2027 10:20" },
]

const AFTER_MOVE: QueueOrderPerson[] = [
  { ...PEOPLE[0]!, position: 1 },
  { ...PEOPLE[3]!, position: 2, isMovedByHand: true },
  { ...PEOPLE[1]!, position: 3 },
  { ...PEOPLE[2]!, position: 4 },
  { ...PEOPLE[4]!, position: 5 },
  { ...PEOPLE[5]!, position: 6 },
  ...PEOPLE.slice(6),
]

const ORIGINAL_ORDER = PEOPLE.slice(0, 6).map((person) => person.name)
const PROPOSED_ORDER = [
  "Tereza Nováková",
  "Klára Veselá",
  "Eliška Dvořáková",
  "Anna Procházková",
  "Kateřina Marková",
  "Lucie Horáková",
]

const TARGETS = PEOPLE.slice(0, 6)
  .filter((person) => person.id !== "p4")
  .map((person) => ({ id: person.id, label: `${person.position}. ${person.name}` }))

const REASON = "Doporučení vedoucího střediska, sestra už je v táboře potvrzená."

const HISTORY: QueueHistoryEntry[] = [
  {
    id: "h4",
    kind: "move",
    at: "dnes 14:51",
    author: "Marie Králová",
    personName: "Klára Veselá",
    placementText: "před Elišku Dvořákovou",
    reason: REASON,
    originalOrder: ORIGINAL_ORDER,
    newOrder: PROPOSED_ORDER,
  },
  {
    id: "h3",
    kind: "evaluation",
    at: "dnes 14:32",
    author: "Automatický režim",
    summary: "11 vhodných · 3 neubytovatelní · 2 ruční určení",
    inputVersion: "Verze vstupů 14",
    order: ORIGINAL_ORDER,
  },
  {
    id: "h2",
    kind: "decision",
    at: "včera 16:20",
    author: "Marie Králová",
    personName: "Markéta Králová",
    fromState: "Čeká na rozhodnutí",
    toState: "Potvrzeno",
    basis: "Návrh ze včera 16:12",
  },
  {
    id: "h1",
    kind: "evaluation",
    at: "včera 16:12",
    author: "Ruční režim, Marie Králová",
    summary: "12 vhodných · 2 neubytovatelní · 2 ruční určení",
    inputVersion: "Verze vstupů 11",
    order: ORIGINAL_ORDER,
  },
]

const SIDEBAR_STYLE = { "--sidebar-width": "14rem" } as CSSProperties

const eventSections = [
  { label: "Přehled", icon: LayoutDashboard },
  { label: "Přihlášky", icon: ClipboardList, isActive: true },
  { label: "Platby", icon: CreditCard },
  { label: "Ubytování", icon: BedDouble },
  { label: "Komunikace", icon: Mail },
  { label: "Nastavení", icon: Settings },
]

type ShellProps = {
  /** Breadcrumb tail after "Přihlášky". */
  crumbs: string[]
  title: string
  badge?: ReactNode
  children: ReactNode
  /** An open dialog over the page. */
  dialog?: ReactNode
}

// The organization shell (sidebar + workspace), static.
function Shell({ crumbs, title, badge, children, dialog }: ShellProps) {
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
        <section className="mx-auto w-full max-w-4xl px-4 py-8 md:py-12">
          <PageHeader
            breadcrumb={
              <Breadcrumb className="mb-4">
                <BreadcrumbList>
                  <BreadcrumbItem>Junák – středisko Lipnice</BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>Letní tábor Lipnice 2027</BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>Přihlášky</BreadcrumbItem>
                  {crumbs.map((crumb, index) => (
                    <Fragment key={crumb}>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        {index === crumbs.length - 1 ? (
                          <BreadcrumbPage>{crumb}</BreadcrumbPage>
                        ) : (
                          crumb
                        )}
                      </BreadcrumbItem>
                    </Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            }
            title={title}
            badge={badge}
          />
          {children}
        </section>
      </SidebarInset>
      {dialog}
    </SidebarProvider>
  )
}

type QueuePageProps = {
  people: QueueOrderPerson[]
  history: QueueHistoryEntry[]
  isOrderFailed?: boolean
  isHistoryFailed?: boolean
  dialog?: ReactNode
}

// Přihlášky → Náhradníci → 1. turnus → Fronta Žena: order and history.
function QueuePage({ people, history, isOrderFailed, isHistoryFailed, dialog }: QueuePageProps) {
  return (
    <Shell
      crumbs={["Náhradníci", QUEUE]}
      title={QUEUE}
      dialog={dialog}
    >
      <div className="space-y-6">
        <QueueOrderDetail
          queueLabel={QUEUE}
          people={people}
          isLoadFailed={isOrderFailed}
        />
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="text-h4">Historie</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QueueHistoryList
              entries={history}
              isLoadFailed={isHistoryFailed}
            />
          </CardContent>
        </Card>
      </div>
    </Shell>
  )
}

const MOVE_DIALOG: QueueOrderMoveDialogProps = {
  isOpen: true,
  personName: "Klára Veselá",
  queueLabel: QUEUE,
  targets: TARGETS,
}

const CONFIRM_DIALOG: QueueOrderConfirmDialogProps = {
  isOpen: true,
  personName: "Klára Veselá",
  placementText: "před Elišku Dvořákovou",
  queueLabel: QUEUE,
  originalOrder: ORIGINAL_ORDER,
  proposedOrder: PROPOSED_ORDER,
  reason: REASON,
}

const meta = {
  title: "Designs/F39-1 Queue order and history",
  component: QueuePage,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: { people: PEOPLE, history: HISTORY },
} satisfies Meta<typeof QueuePage>

export default meta

type Story = StoryObj<typeof meta>

// The kit's destructive Alert description (`text-destructive/90`) is 4.3:1
// against the 4.5:1 AA minimum; these stories report it as a warning.
const contrastWarning = { a11y: { test: "todo" } }

// Dialogs render in a portal outside the canvas and fade in.
const showsDialog = (name: string) => async () => {
  const dialog = await screen.findByRole("dialog", { name })
  await waitFor(() => expect(dialog).toBeVisible())
}

/** People with positions and states; confirmed people are listed apart, without a move. */
export const QueueOrder: Story = {}

/** After a manual move: the moved person is marked and the history shows the intervention. */
export const QueueOrderAfterMove: Story = { args: { people: AFTER_MOVE } }

/** Nobody is pending or waitlisted: no move is offered. */
export const QueueEmpty: Story = {
  args: { people: PEOPLE.filter((person) => person.state === "confirmed") },
}

/** The queue failed to load: an error with a retry, not an empty queue. */
export const OrderLoadFailed: Story = {
  args: { isOrderFailed: true },
  parameters: contrastWarning,
}

/** Step 1 of a move: before or after another person, with a reason. */
export const MoveForm: Story = {
  args: {
    dialog: (
      <QueueOrderMoveDialog
        {...MOVE_DIALOG}
        targetId="p2"
        reason={REASON}
      />
    ),
  },
  play: showsDialog("Přesunout osobu Klára Veselá"),
}

/** Nothing chosen and no reason: errors at the fields, entered values kept. */
export const MoveFormInvalid: Story = {
  args: {
    dialog: (
      <QueueOrderMoveDialog
        {...MOVE_DIALOG}
        placement="after"
        targetError="Vyberte osobu, vedle které se má přesunout."
        reasonError="Uveďte důvod přesunu."
      />
    ),
  },
  play: showsDialog("Přesunout osobu Klára Veselá"),
}

/** Step 2: original order, proposed order and the reason before confirming. */
export const MoveConfirmation: Story = {
  args: { dialog: <QueueOrderConfirmDialog {...CONFIRM_DIALOG} /> },
  play: showsDialog("Potvrdit přesun"),
}

/** Saving: the button is disabled, so a double click cannot move twice. */
export const MoveSaving: Story = {
  args: {
    dialog: (
      <QueueOrderConfirmDialog
        {...CONFIRM_DIALOG}
        isSaving
      />
    ),
  },
  play: showsDialog("Potvrdit přesun"),
}

/** The save failed: the order is unchanged and the move can be retried. */
export const MoveSaveFailed: Story = {
  args: {
    dialog: (
      <QueueOrderConfirmDialog
        {...CONFIRM_DIALOG}
        errorMessage="Pořadí zůstalo beze změny. Zkuste to znovu."
      />
    ),
  },
  parameters: contrastWarning,
  play: showsDialog("Potvrdit přesun"),
}

/** The queue changed meanwhile: nothing is saved; load the current queue and confirm again. */
export const MoveStale: Story = {
  args: {
    dialog: (
      <QueueOrderConfirmDialog
        {...CONFIRM_DIALOG}
        staleMessage="Anna Procházková byla mezitím potvrzena. Načtěte aktuální frontu a přesun potvrďte znovu."
      />
    ),
  },
  parameters: contrastWarning,
  play: showsDialog("Potvrdit přesun"),
}

/** Evaluations, a manual move and a confirmation, newest first. */
export const History: Story = {}

/** No evaluation or intervention saved yet. */
export const HistoryEmpty: Story = { args: { history: [] } }

/** The history failed to load: an error with a retry, not an empty history. */
export const HistoryLoadFailed: Story = {
  args: { isHistoryFailed: true },
  parameters: contrastWarning,
}

const REGISTRATION_HISTORY: QueueHistoryEntry[] = [
  { ...HISTORY[0]!, termLabel: "1. turnus" },
  {
    id: "r2",
    kind: "decision",
    at: "dnes 15:10",
    author: "Marie Králová",
    personName: "Klára Veselá",
    fromState: "Čeká na rozhodnutí",
    toState: "Potvrzeno",
    basis: "Návrh z dnes 14:32",
    termLabel: "2. turnus",
  },
]

type RegistrationPageProps = { history: QueueHistoryEntry[]; isLoadFailed?: boolean }

function RegistrationPage({ history, isLoadFailed }: RegistrationPageProps) {
  return (
    <Shell
      crumbs={["Klára Veselá"]}
      title="Klára Veselá"
      badge={<Badge variant="warning">Náhradník</Badge>}
    >
      <QueueHistoryRegistrationCard
        entries={history}
        isLoadFailed={isLoadFailed}
      />
    </Shell>
  )
}

/** Organizer's registration detail: only the entries about this registration, per term. */
export const RegistrationDetailHistory: Story = {
  render: () => <RegistrationPage history={REGISTRATION_HISTORY} />,
}

/** Registration without any recorded intervention. */
export const RegistrationDetailEmpty: Story = {
  render: () => <RegistrationPage history={[]} />,
}

/** The registration's history failed to load. */
export const RegistrationDetailLoadFailed: Story = {
  render: () => (
    <RegistrationPage
      history={[]}
      isLoadFailed
    />
  ),
  parameters: contrastWarning,
}
