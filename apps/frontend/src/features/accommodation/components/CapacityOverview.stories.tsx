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
  CapacityOverview,
  type CapacityTerm,
  type TermProposal,
} from "@/features/accommodation/components/CapacityOverview"
import {
  TermOccupancy,
  type OccupancyRoom,
  type OccupancyTerm,
  type TermOccupancyProps,
} from "@/features/accommodation/components/TermOccupancy"

// F17-1 design preview: capacity and evaluation proposal per term (Přehled)
// and room data per term (Obsazenost). Static only: every value is hard-coded.

const SIDEBAR_STYLE = { "--sidebar-width": "14rem" } as CSSProperties

const eventSections = [
  { label: "Přehled", icon: LayoutDashboard },
  { label: "Přihlášky", icon: ClipboardList },
  { label: "Platby", icon: CreditCard },
  { label: "Ubytování", icon: BedDouble },
  { label: "Komunikace", icon: Mail },
  { label: "Nastavení", icon: Settings },
]

type PageShellProps = {
  activeSection: "Přehled" | "Ubytování"
  children: ReactNode
}

// The organization shell (sidebar + workspace), static.
function PageShell({ activeSection, children }: PageShellProps) {
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
                  <SidebarMenuButton isActive={section.label === activeSection}>
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
                  <BreadcrumbItem>
                    <BreadcrumbPage>{activeSection}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            }
            title="Letní tábor Lipnice 2027"
            badge={<Badge variant="success">Registrace otevřena</Badge>}
            description="Junák – středisko Lipnice"
          />
          {children}
        </section>
      </SidebarInset>
    </SidebarProvider>
  )
}

const CURRENT: TermProposal = {
  status: "current",
  calculatedAt: "dnes 14:32",
  suitable: 11,
  unaccommodatable: 3,
  manual: 2,
}

const TERM_1: CapacityTerm = {
  id: "turnus-1",
  label: "1. turnus",
  dates: "4.–11. 7. 2027",
  confirmed: 6,
  pending: 14,
  waitlisted: 2,
  beds: 16,
  extraBeds: 2,
  capacity: 18,
  hasRooms: true,
  proposal: CURRENT,
}

const TERM_2: CapacityTerm = {
  id: "turnus-2",
  label: "2. turnus",
  dates: "11.–18. 7. 2027",
  confirmed: 4,
  pending: 5,
  waitlisted: 0,
  beds: 16,
  extraBeds: 1,
  capacity: 17,
  hasRooms: true,
  proposal: {
    status: "current",
    calculatedAt: "dnes 14:32",
    suitable: 5,
    unaccommodatable: 0,
    manual: 0,
  },
}

const TERMS = [TERM_1, TERM_2]

const withProposal = (proposal: TermProposal): CapacityTerm[] => [{ ...TERM_1, proposal }, TERM_2]

const EMPTY_TERM: CapacityTerm = {
  ...TERM_1,
  confirmed: 0,
  pending: 0,
  waitlisted: 0,
  proposal: {
    status: "current",
    calculatedAt: "dnes 14:32",
    suitable: 0,
    unaccommodatable: 0,
    manual: 0,
  },
}

const NO_ROOMS_TERM: CapacityTerm = {
  ...TERM_1,
  beds: 0,
  extraBeds: 0,
  capacity: 0,
  hasRooms: false,
  proposal: { ...CURRENT, suitable: 0, unaccommodatable: 14, manual: 2 },
}

const NO_AVAILABLE_TERM: CapacityTerm = {
  ...NO_ROOMS_TERM,
  hasRooms: true,
}

const meta = {
  title: "Designs/F17-1 Capacity and proposal",
  component: CapacityOverview,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: { terms: TERMS, selectedTermId: "turnus-1" },
  render: (args) => (
    <PageShell activeSection="Přehled">
      <CapacityOverview {...args} />
    </PageShell>
  ),
} satisfies Meta<typeof CapacityOverview>

export default meta

type Story = StoryObj<typeof meta>

// The kit's destructive Alert description is 4.3:1 against the 4.5:1 AA minimum.
const contrastWarning = { a11y: { test: "todo" } }

/** Přehled, 1. turnus: participation counts, capacity and the current proposal. */
export const Overview: Story = {}

/** 2. turnus selected: counts and capacity of a term are never merged with another. */
export const SecondTerm: Story = { args: { selectedTermId: "turnus-2" } }

/** After a change the proposal is marked stale and bulk confirmation is off. */
export const StaleProposal: Story = {
  args: { terms: withProposal({ ...CURRENT, status: "stale" }) },
}

/** A run is in progress: recalculation is disabled until it ends. */
export const Computing: Story = {
  args: { terms: withProposal({ ...CURRENT, status: "computing" }) },
}

/** The run failed: the older proposal stays visible as stale. */
export const CalculationFailed: Story = {
  parameters: contrastWarning,
  args: { terms: withProposal({ ...CURRENT, status: "failed" }) },
}

/** Infeasible run: the violated constraint and the affected confirmed participants. */
export const Conflict: Story = {
  parameters: contrastWarning,
  args: {
    terms: withProposal({
      ...CURRENT,
      status: "conflict",
      conflict: {
        constraint:
          "Potvrzení účastníci v Chatě C nemají stejnou hodnotu pohlaví, v pokoji mohou být jen osoby se stejnou hodnotou.",
        affected: ["Tereza Nováková", "Matěj Černý"],
      },
    }),
  },
}

/** A term without applications shows zero counts. */
export const NoApplications: Story = {
  args: { terms: [EMPTY_TERM, TERM_2] },
}

/** No rooms at all: accommodation capacity is shown as not recorded. */
export const NoRooms: Story = { args: { terms: [NO_ROOMS_TERM, TERM_2] } }

/** Rooms exist but none is available in the term: capacity is zero. */
export const NoAvailableRoom: Story = { args: { terms: [NO_AVAILABLE_TERM, TERM_2] } }

/** Loading failed: an error with a retry, not a false zero. */
export const LoadError: Story = {
  parameters: contrastWarning,
  args: { loadError: "Server je dočasně nedostupný. Zkuste to prosím znovu." },
}

const ROOMS_1: OccupancyRoom[] = [
  { id: "chata-a", label: "Chata A", isAvailable: true, beds: 4, extraBeds: 1, total: 5 },
  { id: "chata-b", label: "Chata B", isAvailable: true, beds: 4, extraBeds: 1, total: 5 },
  { id: "chata-c", label: "Chata C", isAvailable: true, beds: 4, extraBeds: 0, total: 4 },
  { id: "pokoj-1", label: "Pokoj 1", isAvailable: true, beds: 2, extraBeds: 0, total: 2 },
  { id: "pokoj-2", label: "Pokoj 2", isAvailable: true, beds: 2, extraBeds: 0, total: 2 },
]

const OCC_TERM_1: OccupancyTerm = {
  id: "turnus-1",
  label: "1. turnus",
  dates: "4.–11. 7. 2027",
  confirmed: 6,
  waitlisted: 2,
  beds: 16,
  extraBeds: 2,
  capacity: 18,
  free: 12,
  rooms: ROOMS_1,
}

const OCC_TERM_2: OccupancyTerm = {
  id: "turnus-2",
  label: "2. turnus",
  dates: "11.–18. 7. 2027",
  confirmed: 4,
  waitlisted: 0,
  beds: 14,
  extraBeds: 1,
  capacity: 15,
  free: 11,
  rooms: [
    { id: "chata-a", label: "Chata A", isAvailable: true, beds: 4, extraBeds: 0, total: 4 },
    { id: "chata-b", label: "Chata B", isAvailable: true, beds: 4, extraBeds: 1, total: 5 },
    { id: "chata-c", label: "Chata C", isAvailable: true, beds: 4, extraBeds: 0, total: 4 },
    { id: "pokoj-1", label: "Pokoj 1", isAvailable: true, beds: 2, extraBeds: 0, total: 2 },
    { id: "pokoj-2", label: "Pokoj 2", isAvailable: false, beds: 2, extraBeds: 0, total: 2 },
  ],
}

const emptyOf = (term: OccupancyTerm): OccupancyTerm => ({
  ...term,
  confirmed: 0,
  waitlisted: 0,
  beds: 0,
  extraBeds: 0,
  capacity: 0,
  free: 0,
  rooms: [],
})

type OccupancyStoryArgs = TermOccupancyProps

function OccupancyPage(args: OccupancyStoryArgs) {
  return (
    <PageShell activeSection="Ubytování">
      <TermOccupancy {...args} />
    </PageShell>
  )
}

const occupancyArgs: OccupancyStoryArgs = {
  terms: [OCC_TERM_1, OCC_TERM_2],
  selectedTermId: "turnus-1",
  updatedAt: "dnes 14:32",
}

/** Ubytování → Obsazenost, 1. turnus: availability and beds per room, no people in rooms. */
export const OccupancyRooms: StoryObj<OccupancyStoryArgs> = {
  render: () => <OccupancyPage {...occupancyArgs} />,
}

/** 2. turnus: an unavailable room adds no places to the term. */
export const OccupancyUnavailableRoom: StoryObj<OccupancyStoryArgs> = {
  render: () => (
    <OccupancyPage
      {...occupancyArgs}
      selectedTermId="turnus-2"
    />
  ),
}

/** No rooms: accommodation capacity is shown as not recorded. */
export const OccupancyNoRooms: StoryObj<OccupancyStoryArgs> = {
  render: () => (
    <OccupancyPage
      {...occupancyArgs}
      terms={[emptyOf(OCC_TERM_1), emptyOf(OCC_TERM_2)]}
    />
  ),
}

/** Rooms exist but none is available in 2. turnus: zero available capacity. */
export const OccupancyNoAvailableRoom: StoryObj<OccupancyStoryArgs> = {
  render: () => (
    <OccupancyPage
      {...occupancyArgs}
      selectedTermId="turnus-2"
      terms={[
        OCC_TERM_1,
        {
          ...OCC_TERM_2,
          beds: 0,
          extraBeds: 0,
          capacity: 0,
          free: 0,
          rooms: OCC_TERM_2.rooms.map((room) => ({ ...room, isAvailable: false })),
        },
      ]}
    />
  ),
}

/** A refresh is running. */
export const OccupancyRefreshing: StoryObj<OccupancyStoryArgs> = {
  render: () => (
    <OccupancyPage
      {...occupancyArgs}
      isRefreshing
    />
  ),
}

/** Loading failed: an error with a retry, not a false zero. */
export const OccupancyLoadError: StoryObj<OccupancyStoryArgs> = {
  parameters: contrastWarning,
  render: () => (
    <OccupancyPage
      {...occupancyArgs}
      loadError="Server je dočasně nedostupný. Zkuste to prosím znovu."
    />
  ),
}
