import type { ReactNode } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OrganizerEventPage } from "@/screens/designs/OrganizerEventPage"

import {
  EvaluationHistory,
  type HistoryEntry,
} from "@/features/accommodation/components/EvaluationHistory"
import { ManualDeterminationDialog } from "@/features/accommodation/components/ManualDeterminationDialog"
import { TermDecisionDialog } from "@/features/accommodation/components/TermDecisionDialog"
import { TermDecisions, type DecisionTerm } from "@/features/accommodation/components/TermDecisions"
import { reasonText } from "@/features/accommodation/lib/proposal"
import { type GenderAnswer } from "@/features/registrations/api/registrationSchemas"
import { AccommodationCard } from "@/features/registrations/components/AccommodationCard"

// Design of the organizer's registration detail for the accommodation
// evaluation: each term with its own state and its place in the current
// proposal (F13-1), the decision per term (F14-1), the determination of the
// accommodation for every term (spec v4 §4) and the history of this
// registration (F39-1). Static only: no router, queries or API; every value
// is hard-coded.

const NOT_DISCLOSED: GenderAnswer = { gender: "undisclosed", genderOther: null }
const OTHER: GenderAnswer = { gender: "other", genderOther: "nebinární" }

const TERMS: DecisionTerm[] = [
  {
    id: "turnus-1",
    label: "1. turnus",
    details: "4.–11. 7. 2027 · 4 800 Kč",
    state: "pending",
    proposal: { result: "manual", reason: reasonText("R", "Pohlaví") },
  },
  {
    id: "turnus-2",
    label: "2. turnus",
    details: "11.–18. 7. 2027 · 4 800 Kč",
    state: "pending",
    proposal: { result: "manual", reason: reasonText("R", "Pohlaví") },
  },
  {
    // Waitlisting needs no determination (spec v4 §3).
    id: "turnus-3",
    label: "3. turnus",
    details: "18.–25. 7. 2027 · 4 800 Kč",
    state: "waitlisted",
    proposal: { result: "manual", reason: reasonText("R", "Pohlaví") },
  },
]

const DETERMINED_TERMS: DecisionTerm[] = [
  {
    id: "turnus-1",
    label: "1. turnus",
    details: "4.–11. 7. 2027 · 4 800 Kč",
    state: "pending",
    proposal: { result: "suitable" },
  },
  { id: "turnus-2", label: "2. turnus", details: "11.–18. 7. 2027 · 4 800 Kč", state: "confirmed" },
  {
    id: "turnus-3",
    label: "3. turnus",
    details: "18.–25. 7. 2027 · 4 800 Kč",
    state: "waitlisted",
    proposal: { result: "unsuitable", reason: reasonText("A", "Pohlaví") },
  },
]

const HISTORY: HistoryEntry[] = [
  {
    id: "h-3",
    kind: "decision",
    at: "včera 18:08",
    author: "Marie Králová",
    person: "Alex Šimek",
    termLabel: "3. turnus",
    fromState: "Čeká na rozhodnutí",
    toState: "Náhradník",
    basis: "Jednotlivé rozhodnutí",
  },
]

const DETERMINED_HISTORY: HistoryEntry[] = [
  {
    id: "h-6",
    kind: "determination",
    at: "dnes 14:31",
    author: "Marie Králová",
    person: "Barbora Kratochvílová",
    answer: "Jiná odpověď",
    value: "Žena",
    reason: "Domluva s rodiči, chce bydlet s kamarádkami z oddílu.",
  },
  {
    id: "h-5",
    kind: "decision",
    at: "včera 18:10",
    author: "Marie Králová",
    person: "Barbora Kratochvílová",
    termLabel: "2. turnus",
    fromState: "Čeká na rozhodnutí",
    toState: "Potvrzeno",
    basis: "Hromadně z návrhu z včera 18:02",
  },
]

type DetailProps = {
  name: string
  email: string
  answer: GenderAnswer
  /** The organizer's determination, e.g. { value: "Žena", reason: "…" }. */
  determination?: { value: string; reason: string; by: string }
  terms: DecisionTerm[]
  history: ReactNode
  overlay?: ReactNode
}

function Detail({ name, email, answer, determination, terms, history, overlay }: DetailProps) {
  return (
    <OrganizerEventPage
      section="Přihlášky"
      crumbs={["Přihlášky", name]}
      title={name}
      isBadgeHidden
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kontaktní údaje</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">E-mail</dt>
                <dd>{email}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <AccommodationCard
          answer={answer}
          isManualAccommodation={!determination}
          action={
            <Button variant="outline">{determination ? "Změnit určení" : "Určit ubytování"}</Button>
          }
        >
          <dl className="space-y-3 text-sm">
            <div className="space-y-1">
              <dt className="text-muted-foreground">Pohlaví pro ubytování</dt>
              <dd>
                {answer.gender === "other" ? "Jiná odpověď" : "Nechci uvést"}
                {answer.genderOther ? ` (${answer.genderOther})` : ""}
              </dd>
            </div>
            {determination ? (
              <>
                <div className="space-y-1">
                  <dt className="text-muted-foreground">Ubytovat jako</dt>
                  <dd>{determination.value}, všechny termíny</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-muted-foreground">Důvod určení</dt>
                  <dd className="break-words">{determination.reason}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-muted-foreground">Určil(a)</dt>
                  <dd>{determination.by}</dd>
                </div>
              </>
            ) : null}
          </dl>
        </AccommodationCard>
        <TermDecisions terms={terms} />
        {history}
      </div>
      {overlay}
    </OrganizerEventPage>
  )
}

const ALEX: DetailProps = {
  name: "Alex Šimek",
  email: "alex.simek@email.cz",
  answer: NOT_DISCLOSED,
  terms: TERMS,
  history: (
    <EvaluationHistory
      title="Historie vyhodnocení"
      entries={HISTORY}
    />
  ),
}

const BARBORA: DetailProps = {
  name: "Barbora Kratochvílová",
  email: "b.kratochvilova@seznam.cz",
  answer: OTHER,
  determination: {
    value: "Žena",
    reason: "Domluva s rodiči, chce bydlet s kamarádkami z oddílu.",
    by: "Marie Králová, dnes 14:31",
  },
  terms: DETERMINED_TERMS,
  history: (
    <EvaluationHistory
      title="Historie vyhodnocení"
      entries={DETERMINED_HISTORY}
    />
  ),
}

const meta = {
  title: "Designs/F13-1 F14-1 F39-1 Registration detail",
  component: Detail,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: ALEX,
} satisfies Meta<typeof Detail>

export default meta

type Story = StoryObj<typeof meta>

/** Needs a manual determination: pending in two terms and waitlisted in the third, reason R in each. */
export const NeedsDetermination: Story = {}

/** Determined as Žena for every term: the proposal now counts the person in its queue. */
export const Determined: Story = { args: BARBORA }

/** Determining the accommodation from the detail; it holds for every term of the registration. */
export const DetermineFromDetail: Story = {
  args: {
    overlay: (
      <ManualDeterminationDialog
        isOpen
        person="Alex Šimek"
        answer="Nechci uvést"
        values={["Žena", "Muž"]}
        value="Muž"
        reason="Telefonická domluva s rodiči."
      />
    ),
  },
}

/** Saving the determination failed: the earlier state stays, the error is shown. */
export const DetermineFailed: Story = {
  args: {
    overlay: (
      <ManualDeterminationDialog
        isOpen
        person="Alex Šimek"
        answer="Nechci uvést"
        values={["Žena", "Muž"]}
        value="Muž"
        reason="Telefonická domluva s rodiči."
        saveError="Určení se nepodařilo uložit. Zkuste to prosím znovu."
      />
    ),
  },
}

/** Confirming 1. turnus from the detail: the value is determined in the same dialog. */
export const ConfirmTerm: Story = {
  args: {
    overlay: (
      <TermDecisionDialog
        isOpen
        decision="confirm"
        person="Alex Šimek"
        term="1. turnus, 4.–11. 7. 2027"
        determination={{ answer: "Nechci uvést", values: ["Žena", "Muž"] }}
      />
    ),
  },
}

/** No decisions or interventions yet: the history says so. */
export const HistoryEmpty: Story = {
  args: {
    history: (
      <EvaluationHistory
        title="Historie vyhodnocení"
        entries={[]}
      />
    ),
  },
}

/** The history could not be loaded: an error with a retry, never an empty history. */
export const HistoryLoadFailed: Story = {
  args: {
    history: (
      <EvaluationHistory
        title="Historie vyhodnocení"
        entries={[]}
        isLoadFailed
      />
    ),
  },
}
