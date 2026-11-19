import { zodResolver } from "@hookform/resolvers/zod"
import { useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { DefinitionList, DefinitionRow } from "@/components/DefinitionList"
import { FormError } from "@/components/FormError"
import { PendingButton } from "@/components/PendingButton"
import { PhoneField } from "@/components/PhoneField"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { readApiError } from "@/lib/apiError"
import { formatPhone, toE164 } from "@/lib/phone"
import { PHONE_FIELD_MESSAGE } from "@/lib/phoneCountries"

import {
  type ParticipantProfile,
  type ParticipantProfileInput,
} from "@/features/participant-access/api/participantSchemas"
import { useSaveParticipantProfile } from "@/features/participant-access/hooks/useSaveParticipantProfile"

// Every field is optional (S4-08); the limits match the registration form.
const profileFormSchema = z.object({
  firstName: z.string().trim().max(100, "Jméno může mít nejvýše 100 znaků."),
  lastName: z.string().trim().max(100, "Příjmení může mít nejvýše 100 znaků."),
  phone: z
    .string()
    .trim()
    .refine((value) => value === "" || toE164(value) !== null, PHONE_FIELD_MESSAGE),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

const toInput = (values: ProfileFormValues): ParticipantProfileInput => ({
  firstName: values.firstName || null,
  lastName: values.lastName || null,
  phone: values.phone ? toE164(values.phone) : null,
})

type ParticipantProfileFormProps = {
  profile: ParticipantProfile
}

// The stored values are the form's start; a failed save keeps what was typed.
export function ParticipantProfileForm({ profile }: ParticipantProfileFormProps) {
  const save = useSaveParticipantProfile()
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const navigate = useNavigate()
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      phone: profile.phone ? formatPhone(profile.phone) : "",
    },
  })

  // A saved profile returns the participant to the page they came from,
  // or to Moje přihlášky when the profile was opened directly.
  const onSubmit = (values: ProfileFormValues) => {
    save.mutate(toInput(values), {
      onSuccess: () => {
        toast.success("Profil uložen")
        if (canGoBack) router.history.back()
        else void navigate({ to: ROUTES.myRegistrations })
      },
    })
  }

  return (
    <Form {...form}>
      <form
        noValidate
        aria-label="Můj profil"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="text-h4">Osobní údaje</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <DefinitionList layout="stacked">
                <DefinitionRow label="Přihlašovací e-mail">{profile.email}</DefinitionRow>
              </DefinitionList>
              <Separator />
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jméno</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Jan"
                          autoComplete="given-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="min-h-0" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Příjmení</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Novák"
                          autoComplete="family-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="min-h-0" />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <PhoneField {...field} />
                    </FormControl>
                    <FormMessage className="min-h-0" />
                  </FormItem>
                )}
              />
              {save.isError ? (
                <FormError
                  title="Profil se nepodařilo uložit"
                  message={
                    readApiError(save.error).status === 400
                      ? "Zkontrolujte zadané údaje a uložte je znovu."
                      : "Zkontrolujte připojení a zkuste to znovu."
                  }
                />
              ) : null}
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <PendingButton
              type="submit"
              isPending={save.isPending}
            >
              {save.isPending ? "Ukládám…" : "Uložit profil"}
            </PendingButton>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}
