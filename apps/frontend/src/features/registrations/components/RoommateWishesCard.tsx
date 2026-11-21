import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Check, Plus, X } from "lucide-react"
import { toast } from "sonner"

import { FormError } from "@/components/FormError"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { PendingButton } from "@/components/PendingButton"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CommandDialog,
  CommandEmpty,
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

type RoommateWishesCardProps = {
  registrationId: string
}

// Moje přihlášky → Detail přihlášky → Úprava přihlášky (S4-05): the confirmed
// participant's wish to share a room with other confirmed participants of the
// event. It is saved at once, apart from the change of the registration, and
// needs no approval.
export function RoommateWishesCard({ registrationId }: RoommateWishesCardProps) {
  const query = useQuery(roommateWishesQueryOptions(registrationId))
  const [draft, setDraft] = useState<string[] | null>(null)
  const isEditing = draft !== null
  const { data } = query
  // Also after a failed save: the reload refuses, the kept list must not stay editable.
  const isUnavailable =
    query.isError && readApiError(query.error).code === "roommate_wishes_unavailable"

  const action =
    data &&
    !isEditing &&
    !isUnavailable &&
    (data.wishes.length > 0 || data.candidates.length > 0) ? (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDraft(data.wishes.map((wish) => wish.registrationId))}
      >
        {data.wishes.length > 0 ? "Upravit" : "Vybrat spolubydlící"}
      </Button>
    ) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spolubydlící</CardTitle>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
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
        className="space-y-1 text-sm"
      >
        {data.wishes.map((wish) => (
          <li key={wish.registrationId}>
            {wish.name}
            {candidateIds.has(wish.registrationId) ? null : <NotConfirmedMark />}
          </li>
        ))}
      </ul>
    )
  }
  return (
    <p className="text-sm text-muted-foreground">
      {data.candidates.length > 0 ? "Zatím jste nikoho nevybrali." : NO_CANDIDATES}
    </p>
  )
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
  const [isPickerOpen, setIsPickerOpen] = useState(false)

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
    <form
      noValidate
      aria-label="Výběr spolubydlících"
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        // The selection stays in the form when saving fails, ready for another try.
        save.mutate(
          { registrationIds: selected },
          {
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
          className="space-y-1"
        >
          {selected.map((id) => {
            const name = people.get(id)?.name ?? ""
            return (
              <li
                key={id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="min-w-0">
                  {name}
                  {candidateIds.has(id) ? null : <NotConfirmedMark />}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Odebrat ${name}`}
                  disabled={save.isPending}
                  onClick={() => toggle(id)}
                >
                  <X aria-hidden />
                </Button>
              </li>
            )
          })}
        </ul>
      ) : null}

      {data.candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">{NO_CANDIDATES}</p>
      ) : null}

      {isFull ? (
        <p className="text-sm text-muted-foreground">
          Vybrat lze nejvýš {MAX_WISHES} spolubydlících.
        </p>
      ) : null}
      {save.isError ? <FormError message={saveErrorMessage(save.error)} /> : null}
      {/* Wrapped on a narrow screen, the add button keeps to the right like the others. */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {data.candidates.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            aria-haspopup="dialog"
            disabled={save.isPending || isFull}
            onClick={() => setIsPickerOpen(true)}
          >
            <Plus aria-hidden />
            Přidat spolubydlícího
          </Button>
        ) : null}
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={save.isPending}
            onClick={onDone}
          >
            Zrušit
          </Button>
          <PendingButton
            type="submit"
            isPending={save.isPending}
          >
            {save.isPending ? "Ukládám…" : "Uložit"}
          </PendingButton>
        </div>
      </div>

      {data.candidates.length > 0 ? (
        // Stays open between picks; the selection above follows each one.
        <CommandDialog
          open={isPickerOpen}
          onOpenChange={setIsPickerOpen}
          title="Přidat spolubydlícího"
          description="Vyberte potvrzené účastníky akce, se kterými chcete bydlet."
        >
          <CommandInput placeholder="Hledat účastníka…" />
          <CommandList>
            <CommandEmpty>Nikdo nenalezen.</CommandEmpty>
            {isFull ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">
                Vybrat lze nejvýš {MAX_WISHES} spolubydlících.
              </p>
            ) : null}
            <CommandGroup>
              {data.candidates.map((candidate) => {
                const isSelected = selected.includes(candidate.registrationId)
                return (
                  <CommandItem
                    key={candidate.registrationId}
                    value={candidate.registrationId}
                    keywords={[candidate.name]}
                    aria-checked={isSelected}
                    disabled={isFull && !isSelected}
                    onSelect={() => toggle(candidate.registrationId)}
                  >
                    <Check
                      aria-hidden
                      className={cn(isSelected ? "opacity-100" : "opacity-0")}
                    />
                    {candidate.name}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      ) : null}
    </form>
  )
}
