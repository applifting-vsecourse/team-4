import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Check, X } from "lucide-react"
import { toast } from "sonner"

import { FormError } from "@/components/FormError"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { PendingButton } from "@/components/PendingButton"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Skeleton } from "@/components/ui/skeleton"
import { readApiError } from "@/lib/apiError"
import { cn } from "@/lib/utils"

import { roommateWishesQueryOptions } from "@/features/registrations/api/roommateWishQueryOptions"
import {
  type Roommate,
  type RoommateWishes,
} from "@/features/registrations/api/roommateWishSchemas"
import { useSaveRoommateWishes } from "@/features/registrations/hooks/useSaveRoommateWishes"

const NO_CANDIDATES = "Na akci zatím nejsou další potvrzení účastníci."

/** As many as the backend stores (`MAX_ROOMMATE_WISHES`). */
const MAX_WISHES = 20

/** A failed save, worded by what helps next; the selection stays either way. */
function saveErrorMessage(error: unknown): string {
  const { code, message } = readApiError(error)
  if (code === "roommate_wishes_unavailable") {
    return "Přání na spolubydlící jsou dostupná jen s potvrzenou účastí."
  }
  // Someone picked stopped being confirmed meanwhile: the list is reloaded.
  if (code === "roommate_invalid") {
    return `${message ?? "Výběr už neplatí."} Seznam účastníků je aktualizovaný, upravte výběr.`
  }
  return "Spolubydlící se nepodařilo uložit. Výběr zůstává, zkuste to prosím znovu."
}

function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("cs")
}

type RoommateWishesCardProps = {
  registrationId: string
  isReadOnly?: boolean
}

// Moje přihlášky → Detail přihlášky → Ubytování (S4-05): the confirmed
// participant's wish to share a room with other confirmed participants of the
// event. It is saved at once, apart from the change of the registration, and
// needs no approval.
export function RoommateWishesCard({ registrationId, isReadOnly = false }: RoommateWishesCardProps) {
  const query = useQuery(roommateWishesQueryOptions(registrationId))
  const [draft, setDraft] = useState<string[] | null>(null)
  const isEditing = draft !== null
  const { data } = query
  // Also after a failed save: the reload refuses, the kept list must not stay editable.
  const isUnavailable =
    query.isError && readApiError(query.error).code === "roommate_wishes_unavailable"

  const action =
    !isReadOnly &&
      data &&
      !isEditing &&
      !isUnavailable &&
      (data.wishes.length > 0 || data.candidates.length > 0) ? (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setDraft(data.wishes.map((wish) => wish.registrationId))}
      >
        {data.wishes.length > 0 ? "Upravit výběr" : "Vybrat spolubydlící"}
      </Button>
    ) : null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Přání na spolubydlící</h2>
        {!isEditing ? action : null}
      </div>
      {isUnavailable ? (
        // The registration stopped being confirmed: no retry helps.
        <p className="text-sm text-muted-foreground">
          Přání na spolubydlící jsou dostupná jen s potvrzenou účastí.
        </p>
      ) : data ? (
        isEditing ? (
          <WishesForm
            registrationId={registrationId}
            data={data}
            selected={draft}
            onChange={setDraft}
            onDone={() => setDraft(null)}
          />
        ) : (
          <StoredWishes data={data} />
        )
      ) : query.isError ? (
        <LoadError
          title="Spolubydlící se nepodařilo načíst"
          isRetrying={query.isFetching}
          onRetry={() => query.refetch()}
        />
      ) : (
        <LoadingBlock label="Načítání spolubydlících">
          <Skeleton className="h-12 w-full" />
        </LoadingBlock>
      )}
    </div>
  )
}

// The candidates are the other confirmed participants: anyone chosen who isn't
// one of them is no longer confirmed. A stored wish stays until it is removed.
function NotConfirmedMark() {
  return <span className="text-muted-foreground"> · už není potvrzený účastník</span>
}

function StoredWishes({ data }: { data: RoommateWishes }) {
  if (data.wishes.length > 0) {
    const candidateIds = new Set(data.candidates.map((person) => person.registrationId))
    return (
      <ul
        aria-label="Vybraní spolubydlící"
        className="flex flex-wrap gap-x-4 gap-y-1 text-sm"
      >
        {data.wishes.map((wish) => (
          <li key={wish.registrationId} className="wrap-break-word">
            {wish.name}
            {candidateIds.has(wish.registrationId) ? null : <NotConfirmedMark />}
          </li>
        ))}
      </ul>
    )
  }
  return <p className="text-sm text-muted-foreground">Zatím jste nikoho nevybrali</p>
}

type WishesFormProps = {
  registrationId: string
  data: RoommateWishes
  /** Registration ids of the people picked so far, in the order they were added. */
  selected: string[]
  onChange: (selected: string[]) => void
  onDone: () => void
}

function WishesForm({ registrationId, data, selected, onChange, onDone }: WishesFormProps) {
  const save = useSaveRoommateWishes(registrationId)
  const [search, setSearch] = useState("")

  // A stored wish may name someone who is no longer a candidate; it can still be
  // removed. Names seen once are kept, so a pick that a reload drops keeps its name.
  const [known, setKnown] = useState(() => new Map<string, Roommate>())
  const people = useMemo(() => {
    const byId = new Map(known)
    for (const person of [...data.wishes, ...data.candidates]) {
      byId.set(person.registrationId, person)
    }
    return byId
  }, [data, known])
  if (people.size !== known.size) setKnown(people)

  const isFull = selected.length >= MAX_WISHES
  const candidateIds = new Set(data.candidates.map((person) => person.registrationId))
  const filteredCandidates = data.candidates.filter((person) =>
    normalizeSearch(person.name).includes(normalizeSearch(search.trim())),
  )
  const toggle = (registrationId: string) => {
    // A changed selection is a new attempt: the last error no longer applies.
    save.reset()
    if (selected.includes(registrationId)) {
      onChange(selected.filter((id) => id !== registrationId))
    } else if (!isFull) {
      onChange([...selected, registrationId])
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !save.isPending) onDone()
      }}
    >
      <DialogContent
        className="flex max-h-dvh min-h-0 flex-col overflow-hidden"
        showCloseButton={false}
      >
        <DialogHeader className="text-left">
          <DialogTitle>Výběr spolubydlících</DialogTitle>
          <DialogDescription>
            Vyberte potvrzené účastníky akce, se kterými chcete bydlet.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          aria-label="Výběr spolubydlících"
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            // The selection stays in the dialog when saving fails, ready for another try.
            save.mutate(
              { registrationIds: selected },
              {
                onError: () => setSearch(""),
                onSuccess: () => {
                  toast.success("Přání na spolubydlící je uložené")
                  onDone()
                },
              },
            )
          }}
        >
          {selected.length > 0 ? (
            <ul
              aria-label="Vybraní spolubydlící"
              className="flex max-h-24 flex-wrap gap-1 overflow-y-auto  px-4 py-3 sm:px-6"
            >
              {selected.map((id) => {
                const name = people.get(id)?.name ?? ""
                return (
                  <li key={id}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="max-w-full whitespace-normal"
                      aria-label={`Odebrat ${name}`}
                      disabled={save.isPending}
                      onClick={() => toggle(id)}
                    >
                      <span className="break-words">
                        {name}
                        {candidateIds.has(id) ? null : <NotConfirmedMark />}
                      </span>
                      <X aria-hidden />
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : null}
          {isFull ? (
            <p className="px-4 pt-3 text-sm text-muted-foreground sm:px-6">
              Vybrat lze nejvýš {MAX_WISHES} spolubydlících.
            </p>
          ) : null}
          {data.candidates.length === 0 ? (
            <p className="px-4 py-4 text-center text-sm text-muted-foreground sm:px-6">
              {NO_CANDIDATES}
            </p>
          ) : (
            <Command shouldFilter={false} className="h-auto min-h-0 flex-1">
              <CommandInput
                placeholder="Hledat účastníka…"
                value={search}
                onValueChange={setSearch}
              />
              <CommandList className="min-h-0 flex-1">
                <CommandGroup>
                  {filteredCandidates.length === 0 ? (
                    <CommandItem value="no-results" disabled>
                      Nikdo nenalezen.
                    </CommandItem>
                  ) : (
                    filteredCandidates.map((candidate) => {
                      const isSelected = selected.includes(candidate.registrationId)
                      return (
                        <CommandItem
                          key={candidate.registrationId}
                          value={candidate.registrationId}
                          keywords={[candidate.name]}
                          aria-checked={isSelected}
                          disabled={save.isPending || (isFull && !isSelected)}
                          onSelect={() => toggle(candidate.registrationId)}
                        >
                          <Check
                            aria-hidden
                            className={cn(isSelected ? "opacity-100" : "opacity-0")}
                          />
                          {candidate.name}
                        </CommandItem>
                      )
                    })
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          )}
          {save.isError ? (
            <div className="px-4 pt-3 sm:px-6">
              <FormError message={saveErrorMessage(save.error)} />
            </div>
          ) : null}
          <DialogFooter className="mt-3">
            <div className="pt-3 flex gap-4">
              <Button
                type="button"
                variant="outline"
                disabled={save.isPending}
                onClick={onDone}
              >
                Zrušit
              </Button>
              <PendingButton type="submit" isPending={save.isPending}>
                {save.isPending ? "Ukládám…" : "Uložit výběr"}
              </PendingButton>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
