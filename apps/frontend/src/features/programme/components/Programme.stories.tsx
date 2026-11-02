import { Fragment, type CSSProperties, type ReactNode } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  BedDouble,
  CalendarCog,
  ChevronLeft,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  ListChecks,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Settings,
  Trash2,
} from "lucide-react"

import { BrandMark } from "@/components/BrandMark"
import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"
import { PageHeader } from "@/components/PageHeader"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  DeleteProgrammeItemDialog,
  type DeleteProgrammeItemDialogProps,
} from "@/features/programme/components/DeleteProgrammeItemDialog"
import {
  ParticipantProgramme,
  type ParticipantProgrammeTerm,
} from "@/features/programme/components/ParticipantProgramme"
import {
  ProgrammeItemDialog,
  type ProgrammeItemDialogProps,
} from "@/features/programme/components/ProgrammeItemDialog"
import { type ProgrammeDay } from "@/features/programme/components/ProgrammeList"
import { TermProgramme } from "@/features/programme/components/TermProgramme"

// F65 design preview: programme of a term.
// Organizer: Správa akce → Nastavení → Termíny a ceny → program termínu.
// Participant: Moje přihlášky → Detail přihlášky → program potvrzeného termínu.
// Static only: no router links, queries or API; every value below is hard-coded.

const ORGANIZATION = "Spolek Modrá Hora"
const EVENT = "Víkendovky Modrá Hora – podzim 2026"
const LOCATION = "Tábořiště Modrá Hora, Horní Lhota 12, 539 01 Hlinsko"

const TERM_1 = "Turnus 1"
const TERM_1_DATES = "6. 11. – 8. 11. 2026"
const TERM_2 = "Turnus 2"
const TERM_2_DATES = "20. 11. – 22. 11. 2026"

const TURNUS_1_DAYS: ProgrammeDay[] = [
  {
    id: "pa",
    label: "Pátek 6. 11. 2026",
    items: [
      {
        id: "pa-1",
        time: "17:00",
        title: "Příjezd a ubytování",
        place: "Hlavní budova",
        description: "Předání klíčů od pokojů a seznámení s areálem.",
      },
      { id: "pa-2", time: "19:00", title: "Společná večeře", place: "Jídelna" },
      {
        id: "pa-3",
        time: "20:30",
        title: "Večerní hra v lese",
        description: "Vezměte si baterku a pevnou obuv.",
      },
    ],
  },
  {
    id: "so",
    label: "Sobota 7. 11. 2026",
    items: [
      { id: "so-1", time: "8:30", title: "Snídaně", place: "Jídelna" },
      {
        id: "so-2",
        time: "10:00",
        title: "Celodenní výlet na rozhlednu",
        place: "Sraz před hlavní budovou",
        description: "Trasa vede 9 km po značené stezce, s sebou svačinu a pití.",
      },
      { id: "so-3", time: "19:30", title: "Táborák se zpěvem" },
    ],
  },
  {
    id: "ne",
    label: "Neděle 8. 11. 2026",
    items: [
      { id: "ne-1", time: "9:00", title: "Snídaně a balení", place: "Jídelna" },
      { id: "ne-2", time: "11:30", title: "Závěrečné vyhodnocení", place: "Hlavní budova" },
    ],
  },
]

const TURNUS_2_DAYS: ProgrammeDay[] = [
  {
    id: "pa2",
    label: "Pátek 20. 11. 2026",
    items: [
      { id: "pa2-1", time: "17:00", title: "Příjezd a ubytování", place: "Hlavní budova" },
      { id: "pa2-2", time: "19:00", title: "Společná večeře", place: "Jídelna" },
    ],
  },
  {
    id: "so2",
    label: "Sobota 21. 11. 2026",
    items: [
      { id: "so2-1", time: "9:00", title: "Dílna: výroba svíček", place: "Dílna u stodoly" },
      { id: "so2-2", time: "15:00", title: "Turnaj ve stolních hrách" },
    ],
  },
]

// --- Organizer ---------------------------------------------------------------

const SIDEBAR_STYLE = { "--sidebar-width": "14rem" } as CSSProperties

const eventSections = [
  { label: "Přehled", icon: LayoutDashboard },
  { label: "Přihlášky", icon: ClipboardList },
  { label: "Platby", icon: CreditCard },
  { label: "Ubytování", icon: BedDouble },
  { label: "Komunikace", icon: Mail },
  { label: "Nastavení", icon: Settings, isActive: true },
]

// The organization shell (sidebar + workspace) of Správa akce, static.
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

type OrganizerPageProps = {
  days: ProgrammeDay[]
  isLoadFailed?: boolean
  /** An open dialog over the page. */
  children?: ReactNode
}

// Nastavení → Termíny a ceny → Turnus 1 → Program, static.
function OrganizerPage({ days, isLoadFailed, children }: OrganizerPageProps) {
  return (
    <OrganizationShell>
      <PageHeader
        breadcrumb={<Crumbs trail={["Nastavení", "Termíny a ceny", TERM_1]} />}
        title={`Program – ${TERM_1}`}
        badge={<Badge variant="secondary">{TERM_1_DATES}</Badge>}
        description={EVENT}
        actions={
          <Button variant="outline">
            <ChevronLeft />
            Termíny a ceny
          </Button>
        }
      />
      <TermProgramme
        days={days}
        isLoadFailed={isLoadFailed}
      />
      {children}
    </OrganizationShell>
  )
}

// The Nastavení page as it is in the app (Základní údaje, Termíny a ceny), static.
// Each term gets a "Program" action next to the existing edit and delete
// actions. A locked event hides those, but its programme stays editable.
function TermsPage({ isLocked = false }: { isLocked?: boolean }) {
  const terms = [
    {
      id: "t1",
      label: TERM_1,
      dates: TERM_1_DATES,
      price: "2 400 Kč",
      capacity: "24 lůžek",
      items: "8 položek",
    },
    {
      id: "t2",
      label: TERM_2,
      dates: TERM_2_DATES,
      price: "2 400 Kč",
      capacity: "24 lůžek",
      items: "4 položky",
    },
    {
      id: "t3",
      label: "Turnus 3",
      dates: "4. 12. – 6. 12. 2026",
      price: "2 900 Kč",
      capacity: "18 lůžek",
      items: "Bez položek",
    },
  ]
  return (
    <OrganizationShell>
      <PageHeader
        breadcrumb={<Crumbs trail={["Nastavení"]} />}
        title="Nastavení"
        badge={<Badge variant="secondary">{isLocked ? "Přihlašování otevřeno" : "Koncept"}</Badge>}
      />
      <div className="space-y-10">
        {isLocked ? (
          <Alert>
            <Lock />
            <AlertTitle>
              Od otevření přihlašování jsou název, popis, místo, termíny a ceny zamčené
            </AlertTitle>
          </Alert>
        ) : null}
        <section aria-labelledby="event-details-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h2
              id="event-details-heading"
              className="text-h4"
            >
              Základní údaje
            </h2>
            {isLocked ? null : (
              <Button variant="outline">
                <Pencil />
                Upravit akci
              </Button>
            )}
          </div>
          <Card>
            <CardContent>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Název</dt>
                  <dd className="mt-1">{EVENT}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Místo</dt>
                  <dd className="mt-1">{LOCATION}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Popis</dt>
                  <dd className="mt-1">
                    Prodloužené víkendy v přírodě pro rodiny s dětmi: výlety, táborák a dílny.
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="terms-heading">
          <div className="mb-4 flex min-h-9 items-center justify-between gap-4">
            <h2
              id="terms-heading"
              className="text-h4"
            >
              Termíny a ceny
            </h2>
            {isLocked ? null : (
              <Button variant="outline">
                <Plus />
                Přidat termín
              </Button>
            )}
          </div>
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Označení</TableHead>
                    <TableHead>Termín</TableHead>
                    <TableHead>Cena</TableHead>
                    <TableHead>Kapacita</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>
                      <span className="sr-only">Akce</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terms.map((term) => (
                    <TableRow key={term.id}>
                      <TableCell>{term.label}</TableCell>
                      <TableCell>{term.dates}</TableCell>
                      <TableCell>{term.price}</TableCell>
                      <TableCell>{term.capacity}</TableCell>
                      <TableCell>{term.items}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label={`Program termínu ${term.label}`}
                          >
                            <ListChecks />
                            Program
                          </Button>
                          {isLocked ? null : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Upravit termín ${term.label}`}
                              >
                                <Pencil />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Odstranit termín ${term.label}`}
                              >
                                <Trash2 />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      </div>
    </OrganizationShell>
  )
}

// --- Participant -------------------------------------------------------------

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

// Moje přihlášky → Detail přihlášky, with the programme of the confirmed terms, static.
function ParticipantPage({ terms }: { terms: ParticipantProgrammeTerm[] }) {
  return (
    <ParticipantFrame>
      <section className="space-y-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
          >
            <ChevronLeft />
            Moje přihlášky
          </Button>
        </div>
        <div className="space-y-2">
          <h1 className="text-h2 wrap-break-word">{EVENT}</h1>
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin
              aria-hidden
              className="mt-0.5 size-4 shrink-0"
            />
            <span className="wrap-break-word">{LOCATION}</span>
          </p>
        </div>
        <ParticipantProgramme terms={terms} />
      </section>
    </ParticipantFrame>
  )
}

const CONFIRMED_T1: ParticipantProgrammeTerm = {
  id: "t1",
  label: TERM_1,
  dates: TERM_1_DATES,
  status: "confirmed",
  days: TURNUS_1_DAYS,
}

const CONFIRMED_T2: ParticipantProgrammeTerm = {
  id: "t2",
  label: TERM_2,
  dates: TERM_2_DATES,
  status: "confirmed",
  days: TURNUS_2_DAYS,
}

const WAITLISTED_T2: ParticipantProgrammeTerm = {
  ...CONFIRMED_T2,
  status: "waitlisted",
  days: [],
}

// --- Dialog data -------------------------------------------------------------

const TERM_LABEL = `${TERM_1} (${TERM_1_DATES})`

const NEW_ITEM: ProgrammeItemDialogProps = {
  isOpen: true,
  termLabel: TERM_LABEL,
  values: { title: "", date: "", time: "", place: "", description: "" },
}

const EDIT_ITEM: ProgrammeItemDialogProps = {
  isOpen: true,
  isEdit: true,
  termLabel: TERM_LABEL,
  values: {
    title: "Celodenní výlet na rozhlednu",
    date: "2026-11-07",
    time: "10:00",
    place: "Sraz před hlavní budovou",
    description: "Trasa vede 9 km po značené stezce, s sebou svačinu a pití.",
  },
}

const DELETE_ITEM: DeleteProgrammeItemDialogProps = {
  isOpen: true,
  itemTitle: "Celodenní výlet na rozhlednu",
}

const meta = {
  title: "Designs/F65 Program termínu",
  component: OrganizerPage,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: { days: TURNUS_1_DAYS },
} satisfies Meta<typeof OrganizerPage>

export default meta

type Story = StoryObj<typeof meta>

// The kit's destructive Alert description (`text-destructive/90`) is 4.3:1
// against the 4.5:1 AA minimum; the stories showing it report a warning.
const contrastWarning = { a11y: { test: "todo" } }

/** Organizer: the Termíny a ceny table with the entry to each term's programme. */
export const OrganizerTermsEntry: Story = { render: () => <TermsPage /> }

// Entry from a locked event: term actions are hidden, "Program" stays available.
export const OrganizerTermsEntryLocked: Story = { render: () => <TermsPage isLocked /> }

/** Organizer: programme of a term by days, with edit and delete per item. */
export const OrganizerProgramme: Story = {}

/** Organizer: a term without items offers adding the first one. */
export const OrganizerEmpty: Story = { args: { days: [] } }

/** Organizer: the load failed, so a retry is offered instead of an empty programme. */
export const OrganizerLoadFailed: Story = {
  args: { days: [], isLoadFailed: true },
  parameters: contrastWarning,
}

/** Organizer: adding an item; place and description are optional. */
export const AddItem: Story = {
  render: (args) => (
    <OrganizerPage {...args}>
      <ProgrammeItemDialog {...NEW_ITEM} />
    </OrganizerPage>
  ),
}

/** Organizer: invalid input is explained at its fields and the other values stay. */
export const AddItemInvalid: Story = {
  parameters: contrastWarning,
  render: (args) => (
    <OrganizerPage {...args}>
      <ProgrammeItemDialog
        {...NEW_ITEM}
        values={{ ...NEW_ITEM.values, title: "", date: "2026-11-12", time: "", place: "Jídelna" }}
        errors={{
          title: "Vyplňte název položky.",
          date: "Datum musí být v rozsahu termínu, 6. 11. – 8. 11. 2026.",
          time: "Zadejte čas začátku.",
        }}
      />
    </OrganizerPage>
  ),
}

/** Organizer: editing an existing item. */
export const EditItem: Story = {
  render: (args) => (
    <OrganizerPage {...args}>
      <ProgrammeItemDialog {...EDIT_ITEM} />
    </OrganizerPage>
  ),
}

/** Organizer: saving failed; the saved programme and the entered values are kept. */
export const SaveFailed: Story = {
  parameters: contrastWarning,
  render: (args) => (
    <OrganizerPage {...args}>
      <ProgrammeItemDialog
        {...EDIT_ITEM}
        errorMessage="Položku se nepodařilo uložit. Zkuste to prosím znovu."
      />
    </OrganizerPage>
  ),
}

/** Organizer: confirmation before deleting an item. */
export const DeleteItem: Story = {
  render: (args) => (
    <OrganizerPage {...args}>
      <DeleteProgrammeItemDialog {...DELETE_ITEM} />
    </OrganizerPage>
  ),
}

/** Organizer: deleting failed; the item stays in the programme. */
export const DeleteFailed: Story = {
  parameters: contrastWarning,
  render: (args) => (
    <OrganizerPage {...args}>
      <DeleteProgrammeItemDialog
        {...DELETE_ITEM}
        errorMessage="Položku se nepodařilo smazat. Zkuste to prosím znovu."
      />
    </OrganizerPage>
  ),
}

/** Participant: programme of the one confirmed term, split by days. */
export const ParticipantProgrammeConfirmed: Story = {
  render: () => <ParticipantPage terms={[CONFIRMED_T1]} />,
}

/** Participant: a mixed registration shows the confirmed term's programme and only a notice for the waitlisted one. */
export const ParticipantMixedRegistration: Story = {
  render: () => <ParticipantPage terms={[CONFIRMED_T1, WAITLISTED_T2]} />,
}

/** Participant: two confirmed terms, each programme labelled with its term. */
export const ParticipantTwoConfirmedTerms: Story = {
  render: () => <ParticipantPage terms={[CONFIRMED_T1, CONFIRMED_T2]} />,
}

/** Participant: a confirmed term without items. */
export const ParticipantEmpty: Story = {
  render: () => <ParticipantPage terms={[{ ...CONFIRMED_T1, days: [] }]} />,
}

/** Participant: the load failed, so a retry is offered instead of an empty programme. */
export const ParticipantLoadFailed: Story = {
  parameters: contrastWarning,
  render: () => <ParticipantPage terms={[{ ...CONFIRMED_T1, days: [], isLoadFailed: true }]} />,
}

/** Participant: only a waitlisted term; its content is not shown. */
export const ParticipantWaitlistedOnly: Story = {
  render: () => <ParticipantPage terms={[{ ...WAITLISTED_T2, id: "t1", label: TERM_1 }]} />,
}
