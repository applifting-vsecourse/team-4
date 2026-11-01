import { ListOrdered, Loader2, RefreshCw, UserRoundX } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

/** A term offered by the term switch. */
export type WaitlistQueueTerm = {
  id: string
  label: string
}

/** The queue of one room type in the selected term. */
export type WaitlistQueueRow = {
  id: string
  /** The determining value of the hard attribute, e.g. "Žena". */
  roomType: string
  waitlisted: number
  /** Would be accommodated by the proposal. */
  suitable: number
  /** Stay waitlisted: capacity reasons A, B, C or N. */
  unplaceable: number
}

export type WaitlistProposalStatus = "current" | "stale" | "calculating" | "failed" | "conflict"

type WaitlistQueueOverviewProps = {
  terms: WaitlistQueueTerm[]
  selectedTermId: string
  status: WaitlistProposalStatus
  /** Already formatted, e.g. "dnes 14:32"; absent when the term was never calculated. */
  calculatedAt?: string
  queues: WaitlistQueueRow[]
  /** People without a determining answer; they are never placed into a queue. */
  manualCount: number
  /** The violated constraint, shown with the conflict status. */
  conflictMessage?: string
  /** The load failed; the rows passed in, if any, are the last successful ones. */
  loadError?: { shownFrom?: string }
}

const STATUS_BADGES = {
  current: { label: "Aktuální návrh", variant: "success" },
  stale: { label: "Neaktuální návrh", variant: "warning" },
  calculating: { label: "Počítá se…", variant: "secondary" },
  failed: { label: "Výpočet selhal", variant: "destructive-subtle" },
  conflict: { label: "Konflikt", variant: "destructive-subtle" },
} as const

// Správa akce → Přihlášky → Náhradníci → vybraný termín (F16-1). Design only:
// every value is passed in. Ordering of a queue and its history belong to F39-1;
// here a queue only offers the way into it.
export function WaitlistQueueOverview({
  terms,
  selectedTermId,
  status,
  calculatedAt,
  queues,
  manualCount,
  conflictMessage,
  loadError,
}: WaitlistQueueOverviewProps) {
  const queuedTotal = queues.reduce((sum, queue) => sum + queue.waitlisted, 0)
  const total = queuedTotal + manualCount
  const suitable = queues.reduce((sum, queue) => sum + queue.suitable, 0)
  const badge = STATUS_BADGES[status]
  const isCalculating = status === "calculating"
  const hasProposal = total > 0
  const canConfirm = status === "current" && suitable > 0 && !loadError

  return (
    <section
      aria-labelledby="waitlist-heading"
      className="space-y-4"
    >
      <div className="flex min-h-9 items-center justify-between gap-4">
        <h2
          id="waitlist-heading"
          className="text-h4"
        >
          Náhradníci
        </h2>
        <div className="flex items-center gap-3">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          <Button
            variant="outline"
            disabled={isCalculating}
          >
            {isCalculating ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Přepočítat
          </Button>
        </div>
      </div>

      <Tabs value={selectedTermId}>
        <TabsList aria-label="Termín">
          {terms.map((term) => (
            <TabsTrigger
              key={term.id}
              value={term.id}
            >
              {term.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={selectedTermId}>
          <div className="mt-2 space-y-4">
            {loadError ? (
              <Alert variant="destructive">
                <AlertTitle>Data se nepodařilo načíst. Zkuste to znovu.</AlertTitle>
                <AlertDescription>
                  {loadError.shownFrom ? (
                    <p>
                      Zobrazené údaje jsou z posledního úspěšného načtení ({loadError.shownFrom}).
                    </p>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Zkusit znovu
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}

            {status === "stale" ? (
              <Alert>
                <AlertTitle>Návrh je neaktuální</AlertTitle>
                <AlertDescription>
                  <p>
                    Od posledního přepočtu se změnila kapacita nebo přihlášky. Hromadné potvrzení
                    není k dispozici, dokud návrh nepřepočítáte.
                  </p>
                </AlertDescription>
              </Alert>
            ) : null}

            {status === "failed" ? (
              <Alert variant="destructive">
                <AlertTitle>Výpočet návrhu selhal</AlertTitle>
                <AlertDescription>
                  <p>Zobrazený návrh je starší a nebyl znovu ověřen. Zkuste přepočet zopakovat.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Zkusit znovu
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}

            {status === "conflict" ? (
              <Alert variant="destructive">
                <AlertTitle>Návrh nelze vytvořit, protože je v konfliktu</AlertTitle>
                <AlertDescription>
                  <p>{conflictMessage}</p>
                </AlertDescription>
              </Alert>
            ) : null}

            {!hasProposal ? (
              <Card>
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <UserRoundX />
                    </EmptyMedia>
                    <EmptyTitle>V tomto termínu nejsou žádní náhradníci</EmptyTitle>
                    <EmptyDescription>
                      Jakmile se někdo přihlásí na místo, které už není volné, objeví se tady.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </Card>
            ) : (
              <>
                <Card>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      <Stat
                        label="Náhradníci celkem"
                        value={total}
                      />
                      <Stat
                        label="Vhodní k potvrzení"
                        value={suitable}
                      />
                      <Stat
                        label="Ruční určení"
                        value={manualCount}
                      />
                    </dl>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                      <p className="text-sm">
                        Poslední přepočet: {calculatedAt ?? "ještě neproběhl"}
                      </p>
                      <Button disabled={!canConfirm}>Potvrdit vhodné ({suitable})</Button>
                    </div>
                  </CardContent>
                </Card>

                {status === "current" && suitable === 0 && !loadError ? (
                  <Alert>
                    <AlertTitle>Žádný náhradník se nyní nevejde</AlertTitle>
                    <AlertDescription>
                      <p>Kapacita termínu zůstává volná.</p>
                    </AlertDescription>
                  </Alert>
                ) : null}

                <Card padding="none">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fronta</TableHead>
                        <TableHead className="text-right">Náhradníci</TableHead>
                        <TableHead className="text-right">Vhodní</TableHead>
                        <TableHead className="text-right">Nevejdou se</TableHead>
                        <TableHead>
                          <span className="sr-only">Akce</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queues.map((queue) => (
                        <TableRow key={queue.id}>
                          <TableCell>Fronta {queue.roomType}</TableCell>
                          <TableCell className="text-right">{queue.waitlisted}</TableCell>
                          <TableCell className="text-right">{queue.suitable}</TableCell>
                          <TableCell className="text-right">{queue.unplaceable}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                            >
                              <ListOrdered />
                              Pořadí
                              <span className="sr-only"> Fronta {queue.roomType}</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell>Ruční určení</TableCell>
                        <TableCell className="text-right">{manualCount}</TableCell>
                        <TableCell className="text-right">–</TableCell>
                        <TableCell className="text-right">–</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="warning">Vyžaduje ruční určení ubytování</Badge>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Card>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-h3">{value}</dd>
    </div>
  )
}
