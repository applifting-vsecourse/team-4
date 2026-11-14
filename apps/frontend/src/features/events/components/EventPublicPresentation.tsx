import { useEffect, useRef } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ImageOff, ImagePlus, Loader2, Trash2, TriangleAlert } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CollapsibleSection } from "@/components/ui/collapsible-section"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { toE164 } from "@/lib/phone"

import { type PresentationInput, type PublicContact } from "@/features/events/api/eventSchemas"

// Správa akce → Nastavení → Veřejná prezentace (F55).

export const MAX_PHOTOS = 4
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"]

const PHONE_MESSAGE = "Zadejte telefon s mezinárodní předvolbou, např. +420 777 123 456."

const schema = z
  .object({
    description: z
      .string()
      .trim()
      .min(1, "Vyplňte popis.")
      .max(5000, "Popis může mít nejvýše 5000 znaků."),
    conditions: z.string().trim().max(2000, "Podmínky mohou mít nejvýše 2000 znaků."),
    contactName: z.string().trim().max(200, "Jméno může mít nejvýše 200 znaků."),
    contactEmail: z.string().trim().max(320, "E-mail může mít nejvýše 320 znaků."),
    contactPhone: z
      .string()
      .trim()
      .refine((value) => value === "" || toE164(value) !== null, PHONE_MESSAGE),
  })
  // The public contact is left empty as a whole, or has a name and an e-mail.
  .superRefine((values, context) => {
    const hasContact = Boolean(values.contactName || values.contactEmail || values.contactPhone)
    if (!hasContact) return
    if (!values.contactName) {
      context.addIssue({
        code: "custom",
        path: ["contactName"],
        message: "Vyplňte jméno nebo název kontaktu.",
      })
    }
    if (!z.string().email().safeParse(values.contactEmail).success) {
      context.addIssue({
        code: "custom",
        path: ["contactEmail"],
        message: "Zadejte platný e-mail.",
      })
    }
  })

export type PresentationFormValues = z.infer<typeof schema>
export type PresentationField = keyof PresentationFormValues

export const toPresentationValues = (event: {
  description: string
  conditions: string
  contact: PublicContact | null
}): PresentationFormValues => ({
  description: event.description,
  conditions: event.conditions,
  contactName: event.contact?.name ?? "",
  contactEmail: event.contact?.email ?? "",
  contactPhone: event.contact?.phone ?? "",
})

export type PresentationPhoto = {
  id: string
  alt: string
  /** `undefined` while loading, `null` when it could not be loaded. */
  src: string | null | undefined
}

export type EventPublicPresentationProps = {
  initialValues: PresentationFormValues
  /** After the first opening the description is locked like the other basics. */
  isDescriptionLocked?: boolean
  photos: PresentationPhoto[]
  /** Server-side rejections shown at their fields. */
  fieldErrors?: Partial<Record<PresentationField, string>>
  isSaving?: boolean
  errorMessage?: string | null
  photoError?: string | null
  isUploading?: boolean
  removingPhotoId?: string | null
  onSubmit: (input: PresentationInput) => void | Promise<void>
  onAddPhoto: (file: File) => void
  onRemovePhoto: (photoId: string) => void
}

// The values stay filled in after a failed save, so it can be fixed or repeated.
export function EventPublicPresentation({
  initialValues,
  isDescriptionLocked = false,
  photos,
  fieldErrors,
  isSaving = false,
  errorMessage = null,
  photoError = null,
  isUploading = false,
  removingPhotoId = null,
  onSubmit,
  onAddPhoto,
  onRemovePhoto,
}: EventPublicPresentationProps) {
  const form = useForm<PresentationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  })
  const { reset, setError } = form
  const fileInput = useRef<HTMLInputElement>(null)

  // Follow the saved values; a refetch with the same data keeps what is typed.
  const savedKey = JSON.stringify(initialValues)
  useEffect(() => {
    reset(JSON.parse(savedKey) as PresentationFormValues)
  }, [savedKey, reset])

  useEffect(() => {
    for (const [field, message] of Object.entries(fieldErrors ?? {})) {
      setError(field as PresentationField, { type: "server", message })
    }
  }, [fieldErrors, setError])

  const submit = (values: PresentationFormValues) =>
    onSubmit({
      ...values,
      // Sent as saved, so a locked description is never changed by accident.
      description: isDescriptionLocked ? initialValues.description : values.description,
    })

  const canAddPhoto = photos.length < MAX_PHOTOS && !isUploading

  return (
    <CollapsibleSection
      headingId="public-presentation-heading"
      title="Veřejná prezentace"
    >
      <Card>
        <CardContent>
          <div className="space-y-8">
            <section
              aria-labelledby="presentation-photos-heading"
              className="space-y-4"
            >
              <h3
                id="presentation-photos-heading"
                className="text-base font-medium"
              >
                Fotky
              </h3>
              {photos.length > 0 ? (
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {photos.map((photo) => (
                    <li
                      key={photo.id}
                      className="space-y-2"
                    >
                      <PhotoPreview photo={photo} />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full max-w-sm"
                        disabled={removingPhotoId !== null}
                        onClick={() => onRemovePhoto(photo.id)}
                      >
                        {removingPhotoId === photo.id ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Trash2 aria-hidden />
                        )}
                        Odebrat
                        <span className="sr-only"> {photo.alt}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm">Zatím nejsou nahrané žádné fotky.</p>
              )}
              <div className="space-y-2">
                <Input
                  ref={fileInput}
                  type="file"
                  accept={PHOTO_TYPES.join(",")}
                  className="hidden"
                  aria-label="Soubor s fotkou"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ""
                    if (file) onAddPhoto(file)
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canAddPhoto}
                  onClick={() => fileInput.current?.click()}
                >
                  {isUploading ? <Loader2 className="animate-spin" /> : <ImagePlus aria-hidden />}
                  {isUploading ? "Nahrávám…" : "Přidat fotku"}
                </Button>
                <p className="text-sm text-muted-foreground">
                  JPEG, PNG nebo WebP do 5 MB, nejvýše {MAX_PHOTOS} fotky.
                </p>
                {photoError ? (
                  <Alert variant="destructive">
                    <TriangleAlert />
                    <AlertTitle>{photoError}</AlertTitle>
                  </Alert>
                ) : null}
              </div>
            </section>

            <Form {...form}>
              <form
                noValidate
                aria-label="Veřejná prezentace"
                onSubmit={form.handleSubmit(submit)}
                className="space-y-8"
              >
                <fieldset className="space-y-4">
                  <legend className="mb-4 text-base font-medium">O akci</legend>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Popis akce</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={6}
                            maxLength={5000}
                            disabled={isDescriptionLocked}
                            {...field}
                          />
                        </FormControl>
                        {isDescriptionLocked ? (
                          <FormDescription>
                            Od prvního otevření přihlašování popis nelze měnit.
                          </FormDescription>
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="conditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Podmínky účasti</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={4}
                            maxLength={2000}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Každou podmínku napište na samostatný řádek.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </fieldset>

                <fieldset className="space-y-4">
                  <legend className="mb-4 text-base font-medium">Veřejný kontakt</legend>
                  <p className="text-sm text-muted-foreground">
                    Zobrazí se na veřejném detailu akce. Kontakt vašeho účtu se nezveřejňuje.
                  </p>
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jméno nebo název</FormLabel>
                        <FormControl>
                          <Input
                            autoComplete="off"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            autoComplete="off"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon (nepovinné)</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            inputMode="tel"
                            autoComplete="off"
                            placeholder="+420 777 123 456"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </fieldset>

                {errorMessage ? (
                  <Alert variant="destructive">
                    <TriangleAlert />
                    <AlertTitle>{errorMessage}</AlertTitle>
                  </Alert>
                ) : null}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 className="animate-spin" /> : null}
                    {isSaving ? "Ukládám…" : "Uložit"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>
    </CollapsibleSection>
  )
}

// Never a broken image: a placeholder while loading and when loading failed.
function PhotoPreview({ photo }: { photo: PresentationPhoto }) {
  if (photo.src === undefined) return <Skeleton className="aspect-video w-full" />
  if (photo.src === null) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-md bg-muted">
        <ImageOff
          aria-label="Fotku se nepodařilo načíst"
          className="size-6 text-muted-foreground"
        />
      </div>
    )
  }
  return (
    <img
      src={photo.src}
      alt={photo.alt}
      className="aspect-video w-full rounded-md object-cover"
    />
  )
}
