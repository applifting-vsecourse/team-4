import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DialogClose, DialogFooter } from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCalendarRange } from "@/lib/date"

import { type RoomInput, type TermOccupancy } from "@/features/rooms/api/roomSchemas"

const MAX_BEDS = 1000

const schema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Vyplňte označení.")
    .max(100, "Označení může mít nejvýše 100 znaků."),
  bedCount: z
    .string()
    .trim()
    .min(1, "Zadejte počet lůžek.")
    .regex(/^-?\d+$/, "Počet lůžek musí být celé číslo.")
    .refine((value) => Number(value) >= 1, "Počet lůžek musí být alespoň 1.")
    .refine((value) => Number(value) <= MAX_BEDS, `Počet lůžek může být nejvýše ${MAX_BEDS}.`),
  termIds: z.array(z.string()),
})

export type RoomFormValues = z.infer<typeof schema>

export type RoomFieldError = { field: "label"; message: string }

type RoomFormProps = {
  initialValues: RoomFormValues
  /** The terms of this event; availability can only be chosen from them. */
  terms: TermOccupancy[]
  organizationId: string
  eventId: string
  isLoading: boolean
  errorMessage?: string | null
  /** Server-side rejection (duplicate label) shown at its field. */
  fieldError?: RoomFieldError | null
  onSubmit: (input: RoomInput) => void | Promise<void>
}

// Adding and editing a room share this form. A room has the
// same number of beds in every term it is available in, and may be saved
// without any term.
export function RoomForm({
  initialValues,
  terms,
  organizationId,
  eventId,
  isLoading,
  errorMessage,
  fieldError,
  onSubmit,
}: RoomFormProps) {
  const form = useForm<RoomFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  })
  const { setError } = form

  useEffect(() => {
    if (fieldError) {
      setError(fieldError.field, { type: "server", message: fieldError.message })
    }
  }, [fieldError, setError])

  const submit = (values: RoomFormValues) =>
    onSubmit({
      label: values.label,
      // Validated by the schema above.
      bedCount: Number(values.bedCount),
      termIds: values.termIds,
    })

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(submit)}
        className="space-y-4"
      >
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Označení</FormLabel>
              <FormControl>
                <Input
                  placeholder="např. Pokoj 1"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bedCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Počet lůžek</FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  placeholder="např. 4"
                  className="w-30"
                  {...field}
                />
              </FormControl>
              <FormDescription>Stejný ve všech termínech, kdy je pokoj dostupný.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="termIds"
          render={({ field }) => (
            <FormItem>
              <fieldset className="space-y-2">
                <legend className="text-sm leading-none font-medium">Dostupnost</legend>
                {terms.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Akce zatím nemá žádné termíny. Pokoj můžete uložit bez dostupnosti a termíny
                    přiřadit později.{" "}
                    <Link
                      to={ROUTES.eventSettings}
                      hash="terms-heading"
                      params={{ organizationId, eventId }}
                      className="text-foreground underline"
                    >
                      Přidat termín
                    </Link>
                  </p>
                ) : (
                  terms.map((term) => {
                    const id = `room-term-${term.id}`
                    const isChecked = field.value.includes(term.id)
                    return (
                      <div
                        key={term.id}
                        className="flex items-center gap-2"
                      >
                        <Checkbox
                          id={id}
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            field.onChange(
                              checked === true
                                ? [...field.value, term.id]
                                : field.value.filter((termId) => termId !== term.id),
                            )
                          }
                        />
                        <Label htmlFor={id}>
                          {term.label}
                          <span className="font-normal text-muted-foreground">
                            {formatCalendarRange(term.startDate, term.endDate)}
                          </span>
                        </Label>
                      </div>
                    )
                  })
                )}
              </fieldset>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
            >
              Zrušit
            </Button>
          </DialogClose>
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
            Uložit
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
