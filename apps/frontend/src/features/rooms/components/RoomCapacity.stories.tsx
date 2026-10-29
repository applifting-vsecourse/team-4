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

import { type CapacityConflict } from "@/features/rooms/components/CapacityConflictAlert"
import { DeleteRoomCapacityDialog } from "@/features/rooms/components/DeleteRoomCapacityDialog"
import {
  RoomCapacityDialog,
  type RoomTermSetting,
} from "@/features/rooms/components/RoomCapacityDialog"
import {
  TermCapacityOverview,
  type RoomTermCapacity,
  type TermCapacity,
} from "@/features/rooms/components/TermCapacityOverview"

// F11-1 design preview: room capacity, extra beds and availability per term.
// Static only: no router, queries or API; every value below is hard-coded.

const JULY = "turnus-1"
const AUGUST = "turnus-2"

const TERM_1_ROOMS: RoomTermCapacity[] = [
  { id: "chatka-1", label: "Chatka 1", isAvailable: true, beds: 6, extraBeds: 2, total: 8 },
  { id: "chatka-2", label: "Chatka 2", isAvailable: true, beds: 6, extraBeds: 1, total: 7 },
  { id: "chatka-3", label: "Chatka 3", isAvailable: true, beds: 6, extraBeds: 0, total: 6 },
  { id: "srub", label: "Srub u lesa", isAvailable: true, beds: 4, extraBeds: 0, total: 4 },
]

const TERM_1: TermCapacity = {
  id: JULY,
  label: "Turnus 1",
  dates: "4.–17. 7. 2027",
  beds: 22,
  extraBeds: 3,
  capacity: 25,
  confirmed: 23,
  rooms: TERM_1_ROOMS,
}

const TERMS: TermCapacity[] = [
  TERM_1,
  {
    id: AUGUST,
    label: "Turnus 2",
    dates: "1.–14. 8. 2027",
    beds: 16,
    extraBeds: 1,
    capacity: 17,
    confirmed: 9,
    rooms: [
      { id: "chatka-1", label: "Chatka 1", isAvailable: true, beds: 4, extraBeds: 0, total: 4 },
      { id: "chatka-2", label: "Chatka 2", isAvailable: true, beds: 6, extraBeds: 1, total: 7 },
      { id: "chatka-3", label: "Chatka 3", isAvailable: true, beds: 6, extraBeds: 0, total: 6 },
      { id: "srub", label: "Srub u lesa", isAvailable: false, beds: 4, extraBeds: 0, total: 4 },
    ],
  },
]

const NO_ROOMS: TermCapacity[] = [
  { ...TERM_1, beds: 0, extraBeds: 0, capacity: 0, confirmed: 0, rooms: [] },
  {
    id: AUGUST,
    label: "Turnus 2",
    dates: "1.–14. 8. 2027",
    beds: 0,
    extraBeds: 0,
    capacity: 0,
    confirmed: 0,
    rooms: [],
  },
]

const NONE_AVAILABLE: TermCapacity[] = [
  TERM_1,
  {
    id: AUGUST,
    label: "Turnus 2",
    dates: "1.–14. 8. 2027",
    beds: 0,
    extraBeds: 0,
    capacity: 0,
    confirmed: 0,
    rooms: [
      { id: "chatka-1", label: "Chatka 1", isAvailable: false, beds: 4, extraBeds: 0, total: 4 },
      { id: "chatka-2", label: "Chatka 2", isAvailable: false, beds: 6, extraBeds: 1, total: 7 },
      { id: "chatka-3", label: "Chatka 3", isAvailable: false, beds: 6, extraBeds: 0, total: 6 },
      { id: "srub", label: "Srub u lesa", isAvailable: false, beds: 4, extraBeds: 0, total: 4 },
    ],
  },
]

const JULY_SETTING: RoomTermSetting = {
  termId: JULY,
  termLabel: "Turnus 1",
  dates: "4.–17. 7. 2027",
  isAvailable: true,
  beds: "6",
  extraBeds: "2",
}

const AUGUST_SETTING: RoomTermSetting = {
  termId: AUGUST,
  termLabel: "Turnus 2",
  dates: "1.–14. 8. 2027",
  isAvailable: true,
  beds: "4",
  extraBeds: "0",
}

const CHATKA_1: RoomTermSetting[] = [JULY_SETTING, AUGUST_SETTING]

const INVALID: RoomTermSetting[] = [
  { ...JULY_SETTING, beds: "-1", bedsError: "Zadejte nezáporné celé číslo." },
  { ...AUGUST_SETTING, extraBeds: "1,5", extraBedsError: "Zadejte nezáporné celé číslo." },
]

const LOWERED: RoomTermSetting[] = [{ ...JULY_SETTING, beds: "5", extraBeds: "0" }, AUGUST_SETTING]

const NEW_ROOM: RoomTermSetting[] = [
  { ...JULY_SETTING, isAvailable: false, beds: "", extraBeds: "" },
  { ...AUGUST_SETTING, isAvailable: false, beds: "", extraBeds: "" },
]

const LOWER_CONFLICTS: CapacityConflict[] = [
  { termLabel: "Turnus 1", dates: "4.–17. 7. 2027", proposedCapacity: 22, confirmed: 23 },
]

const DELETE_CONFLICTS: CapacityConflict[] = [
  { termLabel: "Turnus 1", dates: "4.–17. 7. 2027", proposedCapacity: 17, confirmed: 23 },
]

const SIDEBAR_STYLE = { "--sidebar-width": "14rem" } as CSSProperties

const eventSections = [
  { label: "Přehled", icon: LayoutDashboard },
  { label: "Přihlášky", icon: ClipboardList },
  { label: "Platby", icon: CreditCard },
  { label: "Ubytování", icon: BedDouble, isActive: true },
  { label: "Komunikace", icon: Mail },
  { label: "Nastavení", icon: Settings },
]

// The organization shell (sidebar + workspace) of the Ubytování page, static.
type RoomsPageProps = {
  terms: TermCapacity[]
  selectedTermId: string
  /** An open dialog over the page. */
  children?: ReactNode
}

function RoomsPage({ terms, selectedTermId, children }: RoomsPageProps) {
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
                  <BreadcrumbItem>Tábor Modrá Hora z. s.</BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>Akce a turnusy</BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>Letní tábor Modrá Hora 2027</BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Ubytování</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            }
            title="Letní tábor Modrá Hora 2027"
            badge={<Badge variant="success">Registrace otevřena</Badge>}
            description="Tábořiště Modrá Hora, Horní Lhota 12, 539 01 Hlinsko"
          />
          <TermCapacityOverview
            terms={terms}
            selectedTermId={selectedTermId}
          />
        </section>
      </SidebarInset>
      {children}
    </SidebarProvider>
  )
}

const meta = {
  title: "Designs/F11-1 Room capacity",
  component: RoomsPage,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: { terms: TERMS, selectedTermId: JULY },
} satisfies Meta<typeof RoomsPage>

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

/** Base beds, extra beds and their sum per room in the selected term. */
export const Overview: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Pokoje" })).toBeVisible()
  },
}

/** An unavailable room adds no places; Turnus 2 is the selected term. */
export const UnavailableRoom: Story = { args: { selectedTermId: AUGUST } }

/** No rooms yet: adding one is offered and the capacity is zero. */
export const NoRooms: Story = { args: { terms: NO_ROOMS } }

/** No room is available in Turnus 2: the term shows zero capacity. */
export const NoRoomAvailable: Story = {
  args: { terms: NONE_AVAILABLE, selectedTermId: AUGUST },
}

/** Adding a room: its availability and beds are set for each term. */
export const AddRoom: Story = {
  args: {
    children: (
      <RoomCapacityDialog
        isOpen
        label=""
        terms={NEW_ROOM}
      />
    ),
  },
  play: showsDialog("Nový pokoj"),
}

/** Editing a room: different beds, extra beds and availability per term. */
export const EditRoom: Story = {
  args: {
    children: (
      <RoomCapacityDialog
        isOpen
        isEdit
        label="Chatka 1"
        terms={CHATKA_1}
      />
    ),
  },
  play: showsDialog("Upravit pokoj Chatka 1"),
}

/** A negative or decimal value is marked and the change is not saved. */
export const InvalidValues: Story = {
  args: {
    children: (
      <RoomCapacityDialog
        isOpen
        isEdit
        label="Chatka 1"
        terms={INVALID}
      />
    ),
  },
  play: showsDialog("Upravit pokoj Chatka 1"),
}

/** Lowering beds below the confirmed participants of a term is refused. */
export const BelowConfirmed: Story = {
  parameters: contrastWarning,
  args: {
    children: (
      <RoomCapacityDialog
        isOpen
        isEdit
        label="Chatka 1"
        terms={LOWERED}
        conflicts={LOWER_CONFLICTS}
      />
    ),
  },
  play: showsDialog("Upravit pokoj Chatka 1"),
}

/** Saving failed: the entered values stay for a retry, no success is shown. */
export const SaveFailed: Story = {
  parameters: contrastWarning,
  args: {
    children: (
      <RoomCapacityDialog
        isOpen
        isEdit
        label="Chatka 1"
        terms={CHATKA_1}
        errorMessage="Pokoj se nepodařilo uložit. Zkuste to prosím znovu."
      />
    ),
  },
  play: showsDialog("Upravit pokoj Chatka 1"),
}

/** Deleting a room that the confirmed participants of a term need is refused. */
export const DeleteConflict: Story = {
  parameters: contrastWarning,
  args: {
    children: (
      <DeleteRoomCapacityDialog
        isOpen
        label="Chatka 1"
        conflicts={DELETE_CONFLICTS}
      />
    ),
  },
  play: showsDialog("Odstranit pokoj „Chatka 1“?"),
}
