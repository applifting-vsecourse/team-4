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
  EvaluationMode,
  type EvaluationModeValue,
} from "@/features/accommodation/components/EvaluationMode"
import {
  EvaluationProposal,
  type EvaluationTerm,
  type ProposalPerson,
  type TermProposal,
} from "@/features/accommodation/components/EvaluationProposal"

// F13-1 design preview: evaluation proposal per term and the evaluation mode.
// Static only: no router, queries or API; every value below is hard-coded.

const TERMS: EvaluationTerm[] = [
  { id: "turnus-1", label: "1. turnus", dates: "4.–11. 7. 2027" },
  { id: "turnus-2", label: "2. turnus", dates: "11.–18. 7. 2027" },
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
  fields: Pick<ProposalPerson, "answer" | "suitability" | "reason"> &
    Partial<Pick<ProposalPerson, "state">>,
): ProposalPerson {
  return {
    id: `p-${index + 1}`,
    position: index + 1,
    name: NAMES[index] ?? "",
    state: "pending",
    ...fields,
  }
}

// 11 suitable, 3 unsuitable (two A, one B), 2 manual.
const PEOPLE: ProposalPerson[] = [
  person(0, { answer: "Žena", suitability: "suitable" }),
  person(1, { answer: "Muž", suitability: "suitable" }),
  person(2, { answer: "Žena", suitability: "suitable" }),
  person(3, { answer: "Muž", suitability: "suitable" }),
  person(4, { answer: "Žena", suitability: "suitable" }),
  person(5, { answer: "Muž", suitability: "suitable" }),
  person(6, { answer: "Žena", suitability: "suitable" }),
  person(7, { answer: "Muž", suitability: "suitable" }),
  person(8, { answer: "Žena", suitability: "suitable" }),
  person(9, { answer: "Muž", suitability: "suitable" }),
  person(10, { answer: "Žena", suitability: "suitable" }),
  person(11, { answer: "Muž", suitability: "unsuitable", reason: "A", state: "waitlisted" }),
  person(12, { answer: "Žena", suitability: "unsuitable", reason: "A", state: "waitlisted" }),
  person(13, { answer: "Muž", suitability: "unsuitable", reason: "B", state: "waitlisted" }),
  person(14, { answer: "Jiná odpověď", suitability: "manual", reason: "R" }),
  person(15, { answer: "Neuvedeno", suitability: "manual", reason: "R" }),
]

const CURRENT: TermProposal = {
  status: "current",
  lastRun: "dnes 14:32",
  suitableCount: 11,
  unsuitableCount: 3,
  manualCount: 2,
  people: PEOPLE,
}

const NO_CAPACITY: TermProposal = {
  status: "current",
  lastRun: "dnes 14:32",
  suitableCount: 0,
  unsuitableCount: 3,
  manualCount: 1,
  people: [
    person(0, { answer: "Žena", suitability: "unsuitable", reason: "N" }),
    person(1, { answer: "Muž", suitability: "unsuitable", reason: "N" }),
    person(2, { answer: "Žena", suitability: "unsuitable", reason: "N" }),
    person(3, { answer: "Nechci uvést", suitability: "manual", reason: "R" }),
  ],
}

const CONFLICT: TermProposal = {
  status: "conflict",
  lastRun: "dnes 14:32",
  suitableCount: 0,
  unsuitableCount: 0,
  manualCount: 0,
  people: PEOPLE.map(({ suitability: _suitability, reason: _reason, ...rest }) => rest),
  conflict: {
    constraint:
      "Potvrzení účastníci se nevejdou do pokojů tak, aby v jednom pokoji měli všichni stejnou hodnotu pohlaví.",
    participants: ["Petr Beneš (Muž)", "Hana Jelínková (Žena)", "Radek Sýkora (Muž)"],
  },
}

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
type EvaluationPageProps = {
  activeSection: "Přihlášky" | "Nastavení"
  children: ReactNode
}

function EvaluationPage({ activeSection, children }: EvaluationPageProps) {
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
                  <BreadcrumbItem>
                    <BreadcrumbPage>{activeSection}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            }
            title="Letní tábor Lipnice 2027"
            badge={<Badge variant="success">Registrace otevřena</Badge>}
          />
          {children}
        </section>
      </SidebarInset>
    </SidebarProvider>
  )
}

const meta = {
  title: "Designs/F13-1 Evaluation proposal",
  component: EvaluationPage,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: { activeSection: "Přihlášky", children: null },
} satisfies Meta<typeof EvaluationPage>

export default meta

type Story = StoryObj<typeof meta>

// The kit's destructive Alert description (`text-destructive/90`) is 4.3:1
// against the 4.5:1 AA minimum; these stories report it as a warning.
const contrastWarning = { a11y: { test: "todo" } }

function proposalPage(proposal: TermProposal, selectedTermId = "turnus-1"): ReactNode {
  return (
    <EvaluationProposal
      terms={TERMS}
      selectedTermId={selectedTermId}
      proposal={proposal}
    />
  )
}

function modePage(mode: EvaluationModeValue, saveError?: string): ReactNode {
  return (
    <EvaluationMode
      mode={mode}
      saveError={saveError}
    />
  )
}

/** Current proposal: 11 suitable, 3 without capacity, 2 needing manual determination. */
export const CurrentProposal: Story = { args: { children: proposalPage(CURRENT) } }

/** The inputs changed since the last run: bulk confirmation is off, Přepočítat is offered. */
export const StaleProposal: Story = {
  args: { children: proposalPage({ ...CURRENT, status: "stale" }) },
}

/** A run is in progress: Přepočítat is disabled and the previous result is not confirmable. */
export const Computing: Story = {
  args: { children: proposalPage({ ...CURRENT, status: "computing" }) },
}

/** The run failed: the older proposal stays visible as stale and can be retried. */
export const RunFailed: Story = {
  args: { children: proposalPage({ ...CURRENT, status: "failed" }) },
  parameters: contrastWarning,
}

/** Infeasible run: the violated constraint and the affected confirmed participants. */
export const Conflict: Story = {
  args: { children: proposalPage(CONFLICT) },
  parameters: contrastWarning,
}

/** The term has no usable capacity: nobody is suitable, no places are promised. */
export const NoCapacity: Story = {
  args: { children: proposalPage(NO_CAPACITY, "turnus-2") },
}

/** Nobody is waiting for a decision in the term. */
export const NoPeople: Story = {
  args: {
    children: proposalPage(
      { status: "current", suitableCount: 0, unsuitableCount: 0, manualCount: 0, people: [] },
      "turnus-2",
    ),
  },
}

/** Nastavení → Automatizace in the automatic mode. */
export const ModeAutomatic: Story = {
  args: { activeSection: "Nastavení", children: modePage("automatic") },
}

/** Nastavení → Automatizace in the manual mode. */
export const ModeManual: Story = {
  args: { activeSection: "Nastavení", children: modePage("manual") },
}

/** Saving the mode failed. */
export const ModeSaveFailed: Story = {
  args: {
    activeSection: "Nastavení",
    children: modePage("manual", "Zkuste to prosím znovu."),
  },
  parameters: contrastWarning,
}
