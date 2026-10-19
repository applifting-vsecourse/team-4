import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import { type EventInput } from "@/features/events/api/eventSchemas"

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Vyplňte název akce.")
    .max(200, "Název akce může mít nejvýše 200 znaků."),
  location: z
    .string()
    .trim()
    .min(1, "Vyplňte místo.")
    .max(300, "Místo může mít nejvýše 300 znaků."),
  description: z
    .string()
    .trim()
    .min(1, "Vyplňte popis.")
    .max(5000, "Popis může mít nejvýše 5000 znaků."),
})

const EMPTY: EventInput = { name: "", location: "", description: "" }

type EventFormProps = {
  /** Saved values when editing; a new event starts empty. */
  initialValues?: EventInput
  submitLabel: string
  isLoading: boolean
  errorMessage?: string | null
  onSubmit: (values: EventInput) => void | Promise<void>
  onCancel: () => void
}

// Creating and editing an event share this form (E1). The values stay filled
// in after a failed attempt: the form is never reset on error.
export function EventForm({
  initialValues = EMPTY,
  submitLabel,
  isLoading,
  errorMessage,
  onSubmit,
  onCancel,
}: EventFormProps) {
  const form = useForm<EventInput>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  })
  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Název akce</FormLabel>
              <FormControl>
                <Input
                  placeholder="např. Lesní dobrodružství 2027"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Místo</FormLabel>
              <FormControl>
                <Input
                  placeholder="např. Podlesí"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Popis</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="např. program a pro koho je akce určena"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Zrušit
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
