import { useEffect } from "react"
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

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Zadejte název organizace.")
    .max(200, "Název může mít nejvýše 200 znaků."),
})

type FormValues = z.infer<typeof schema>

type OrganizationFormProps = {
  isLoading: boolean
  errorMessage?: string | null
  // Server-side rejection of the name (duplicate), shown at the field.
  nameError?: string | null
  onSubmit: (values: FormValues) => void | Promise<void>
}

// The name stays filled in after a failed attempt: the form is never reset.
export function OrganizationForm({
  isLoading,
  errorMessage,
  nameError,
  onSubmit,
}: OrganizationFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  })
  const { setError } = form

  useEffect(() => {
    if (nameError) setError("name", { type: "server", message: nameError })
  }, [nameError, setError])

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
              <FormLabel>Název organizace</FormLabel>
              <FormControl>
                <Input
                  autoComplete="organization"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
          Založit organizaci
        </Button>
      </form>
    </Form>
  )
}
