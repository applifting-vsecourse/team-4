// Shared vocabulary of the accommodation evaluation designs (F13-1, F14-1,
// F16-1, F17-1, F39-1), mirroring what the solver of S3-T4 returns
// (spec v4 §5, §7): a run is solved, infeasible, timeout or failed, and a
// solved proposal is current only while the term's inputs are unchanged.

/**
 * current / stale: the shown proposal matches / no longer matches the term's inputs.
 * running: a run is in progress; a shown older proposal is stale.
 * failed / timeout: the last run did not finish; a shown older proposal is stale.
 * infeasible: confirmed participants no longer fit; there is no proposal.
 * none: the term was never evaluated.
 */
export type EvaluationStatus =
  "current" | "stale" | "running" | "failed" | "timeout" | "infeasible" | "none"

/** Why a person is not suitable in the proposal (spec v4 §7.5). */
export type ReasonCode = "A" | "B" | "C" | "N" | "R"

export type ProposalResult = "suitable" | "unsuitable" | "manual"

export type ParticipationState = "pending" | "waitlisted"

export const STATUS_BADGE: Record<
  EvaluationStatus,
  {
    label: string
    variant: "success" | "warning" | "secondary" | "outline" | "destructive-subtle"
  }
> = {
  current: { label: "Aktuální návrh", variant: "success" },
  stale: { label: "Neaktuální návrh", variant: "warning" },
  running: { label: "Přepočítává se", variant: "secondary" },
  failed: { label: "Výpočet selhal", variant: "destructive-subtle" },
  timeout: { label: "Výpočet nedoběhl", variant: "destructive-subtle" },
  infeasible: { label: "Konflikt potvrzených", variant: "destructive-subtle" },
  none: { label: "Bez návrhu", variant: "outline" },
}

export const RESULT_BADGE: Record<
  ProposalResult,
  { label: string; variant: "success" | "warning" | "destructive-subtle" }
> = {
  suitable: { label: "Vhodný", variant: "success" },
  unsuitable: { label: "Neubytovatelný", variant: "destructive-subtle" },
  manual: { label: "Ruční určení", variant: "warning" },
}

export const STATE_LABEL: Record<ParticipationState, string> = {
  pending: "Čeká na rozhodnutí",
  waitlisted: "Náhradník",
}

/** The reason as the spec words it; `attribute` is the hard attribute, e.g. "Pohlaví". */
export function reasonText(code: ReasonCode, attribute: string): string {
  switch (code) {
    case "A":
      return "Kapacita termínu je naplněná potvrzenými a osobami s vyšší prioritou."
    case "B":
      return `Volné místo je jen v pokojích s jinou hodnotou „${attribute}“.`
    case "C":
      return "Ubytování by snížilo celkový počet ubytovaných v termínu."
    case "N":
      return "Termín nemá dostupnou kapacitu."
    case "R":
      return "Vyžaduje ruční určení ubytování."
  }
}

/** Only the current proposal can be confirmed in bulk (spec v4 §5). */
export const isConfirmable = (status: EvaluationStatus) => status === "current"
