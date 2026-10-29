import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Mail } from "lucide-react"
import { useForm } from "react-hook-form"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import {
  magicLinkEmailSchema,
  type MagicLinkEmail,
} from "@/features/participant-access/api/participantSchemas"
import { useRequestMagicLink } from "@/features/participant-access/hooks/useRequestMagicLink"

type MagicLinkRequestProps = {
  // Why the visitor is here instead of on the list: a used or expired link,
  // an ended session. Always followed by the way to ask for a new link.
  notice?: string
}

// Asking for a sign-in link: the form stays and the confirmation
// appears under it, the same whatever the e-mail is.
export function MagicLinkRequest({ notice }: MagicLinkRequestProps) {
  const request = useRequestMagicLink()
  const form = useForm<MagicLinkEmail>({
    resolver: zodResolver(magicLinkEmailSchema),
    defaultValues: { email: "" },
  })

  return (
    <Card>
      <CardContent>
        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit((values) => request.mutate(values.email))}
            className="space-y-6"
          >
            <h1 className="text-h2">Moje přihlášky</h1>
            {notice ? (
              <Alert>
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            ) : null}
            {request.isError ? (
              <Alert variant="destructive">
                <AlertDescription>
                  Odkaz se nepodařilo vyžádat. Zkuste to prosím znovu.
                </AlertDescription>
              </Alert>
            ) : null}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="jan@novak.cz"
                      autoComplete="email"
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
              disabled={request.isPending}
            >
              {request.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Poslat přihlašovací odkaz
            </Button>

            {request.isSuccess ? (
              <Alert>
                <Mail aria-hidden />
                <AlertDescription role="status">{request.data.message}</AlertDescription>
              </Alert>
            ) : null}
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
