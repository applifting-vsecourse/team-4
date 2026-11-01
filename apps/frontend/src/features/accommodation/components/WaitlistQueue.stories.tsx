import type { CSSProperties } from "react"
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
  WaitlistQueueOverview,
  type WaitlistQueueRow,
  type WaitlistQueueTerm,
} from "@/features/accommodation/components/WaitlistQueueOverview"

// F16-1 design preview: waitlist queues per term and room type.
// Static only: no router, queries or API; every value below is hard-coded.

const TERMS: WaitlistQueueTerm[] = [
  { id: "turnus-1", label: "1. turnus" },
  { id: "turnus-2", label: "2. turnus" },
]

// 1. turnus: 11 vhodní, 3 neubytovatelní (A, A, B), 2 ruční určení.
const QUEUES: WaitlistQueueRow[] = [
  { id: "zena", roomType: "Žena", waitlisted: 8, suitable: 6, unplaceable: 2 },
  { id: "muz", roomType: "Muž", waitlisted: 6, suitable: 5, unplaceable: 1 },
]

const NONE_SUITABLE: WaitlistQueueRow[] = [
  { id: "zena", roomType: "Žena", waitlisted: 5, suitable: 0, unplaceable: 5 },
  { id: "muz", roomType: "Muž", waitlisted: 3, suitable: 0, unplaceable: 3 },
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

type WaitlistPageProps = React.ComponentProps<typeof WaitlistQueueOverview>

// The organization shell (sidebar + workspace) of the Přihlášky page, static.
function WaitlistPage(props: WaitlistPageProps) {
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
                  <BreadcrumbItem>Akce a turnusy</BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>Letní tábor Lipnice 2027</BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>Přihlášky</BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Náhradníci</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            }
            title="Letní tábor Lipnice 2027"
            badge={<Badge variant="success">Registrace otevřena</Badge>}
          />
          <WaitlistQueueOverview {...props} />
        </section>
      </SidebarInset>
    </SidebarProvider>
  )
}

const meta = {
  title: "Designs/F16-1 Waitlist queues",
  component: WaitlistPage,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: {
    terms: TERMS,
    selectedTermId: "turnus-1",
    status: "current",
    calculatedAt: "dnes 14:32",
    queues: QUEUES,
    manualCount: 2,
  },
} satisfies Meta<typeof WaitlistPage>

export default meta

type Story = StoryObj<typeof meta>

// The kit's destructive Alert description (`text-destructive/90`) is 4.3:1
// against the 4.5:1 AA minimum; these stories report it as a warning.
const contrastWarning = { a11y: { test: "todo" } }

/** Current proposal: queues per room type, suitable people, manual cases, bulk confirmation. */
export const CurrentProposal: Story = {}

/** Stale proposal after a change: confirmation is off, Přepočítat is the way forward. */
export const StaleProposal: Story = { args: { status: "stale" } }

/** A recalculation is running: Přepočítat is off and the status says so. */
export const Calculating: Story = { args: { status: "calculating" } }

/** The run failed: the older proposal stays visible and is marked as not verified. */
export const CalculationFailed: Story = {
  parameters: contrastWarning,
  args: { status: "failed", calculatedAt: "včera 18:05" },
}

/** The run is infeasible: the violated constraint is named, nobody is confirmed. */
export const Conflict: Story = {
  parameters: contrastWarning,
  args: {
    status: "conflict",
    conflictMessage:
      "Potvrzené osoby (14 žen) přesahují kapacitu pokojů typu Žena v termínu 1. turnus (12 lůžek).",
  },
}

/** Waitlisted people exist but none fits now: the capacity stays free, not an error. */
export const NoneSuitable: Story = { args: { queues: NONE_SUITABLE } }

/** Only people needing manual determination: no queue by room type is invented. */
export const OnlyManualDetermination: Story = {
  args: {
    queues: [
      { id: "zena", roomType: "Žena", waitlisted: 0, suitable: 0, unplaceable: 0 },
      { id: "muz", roomType: "Muž", waitlisted: 0, suitable: 0, unplaceable: 0 },
    ],
    manualCount: 3,
  },
}

/** No waitlisted people in the selected term (2. turnus). */
export const NoWaitlisted: Story = {
  args: {
    selectedTermId: "turnus-2",
    queues: [],
    manualCount: 0,
    calculatedAt: undefined,
  },
}

/** Loading failed after an earlier success: old numbers stay, marked as old, with a retry. */
export const LoadFailedWithOldData: Story = {
  parameters: contrastWarning,
  args: { status: "stale", loadError: { shownFrom: "dnes 14:32" } },
}

/** The first load failed: no data, an error with a retry, no empty state. */
export const LoadFailed: Story = {
  parameters: contrastWarning,
  args: { queues: [], manualCount: 0, calculatedAt: undefined, loadError: {} },
}
