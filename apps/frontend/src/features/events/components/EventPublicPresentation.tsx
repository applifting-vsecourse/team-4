import { useEffect, useRef } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ExternalLink, ImageOff, ImagePlus, Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { FormError } from "@/components/FormError"
import { PendingButton } from "@/components/PendingButton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CollapsibleSection } from "@/components/ui/collapsible-section"
import { FieldDescription, FieldLegend, FieldSet } from "@/components/ui/field"
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

const schema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Vyplňte popis.")
    .max(5000, "Popis může mít nejvýše 5000 znaků."),
  conditions: z.string().trim().max(2000, "Podmínky mohou mít nejvýše 2000 znaků."),
  contactName: z.string().trim().max(200, "Jméno může mít nejvýše 200 znaků."),
  contactEmail: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.string().email().safeParse(value).success,
      "Zadejte platný e-mail.",
    )
    .max(320, "E-mail může mít nejvýše 320 znaků."),
  contactPhone: z
    .string()
    .trim()
    .refine((value) => value === "" || toE164(value) !== null, PHONE_MESSAGE),
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
  publicId: string
  isPublished: boolean
  initialValues: PresentationFormValues
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
  publicId,
  isPublished,
  initialValues,
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

  const submit = (values: PresentationFormValues) => onSubmit(values)

  const canAddPhoto = photos.length < MAX_PHOTOS && !isUploading

  return (
    <CollapsibleSection
      headingId="public-presentation-heading"
      title="Veřejná prezentace"
      alwaysOpen
    >
      <Card>
        <CardContent>
          <div className="space-y-6">
            <section
              aria-labelledby="presentation-photos-heading"
              className="space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3
                    id="presentation-photos-heading"
                    className="text-base font-medium"
                  >
                    Fotky
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    {photos.length}/{MAX_PHOTOS}
                  </span>
                </div>
                {isPublished ? (
                  <Button
                    asChild
                    variant="secondary"
                    size="sm"
                  >
                    <a
                      href={ROUTES.publicEvent.replace("$publicId", encodeURIComponent(publicId))}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink aria-hidden />
                      Náhled veřejné stránky
                    </a>
                  </Button>
                ) : null}
              </div>
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
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {photos.map((photo) => (
                  <li
                    key={photo.id}
                    className="space-y-2"
                  >
                    <PhotoPreview photo={photo} />
                    <PendingButton
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full max-w-sm"
                      isPending={removingPhotoId === photo.id}
                      icon={<Trash2 aria-hidden />}
                      disabled={removingPhotoId !== null}
                      onClick={() => onRemovePhoto(photo.id)}
                    >
                      Odebrat<span className="sr-only"> {photo.alt}</span>
                    </PendingButton>
                  </li>
                ))}
                <li>
                  <PendingButton
                    type="button"
                    variant="outline"
                    className="aspect-video h-auto w-full"
                    isPending={isUploading}
                    icon={<ImagePlus aria-hidden />}
                    disabled={!canAddPhoto}
                    onClick={() => fileInput.current?.click()}
                  >
                    {isUploading ? "Nahrávám…" : "Přidat fotku"}
                  </PendingButton>
                </li>
              </ul>
              {photos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Zatím nejsou nahrané žádné fotky.</p>
              ) : null}
              <p className="text-sm text-muted-foreground">
                JPEG, PNG nebo WebP do 5 MB; nejvýše {MAX_PHOTOS} fotky.
              </p>
              {photoError ? <FormError message={photoError} /> : null}
            </section>

            <Form {...form}>
              <form
                noValidate
                aria-label="Veřejná prezentace"
                onSubmit={form.handleSubmit(submit)}
                className="space-y-6"
              >
                <div className="grid gap-8 lg:grid-cols-2">
                  <div className="space-y-8">
                    <FieldSet>
                      <FieldLegend>O akci</FieldLegend>
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <FormLabel>Popis akce</FormLabel>
                              <FieldRequirement required />
                            </div>
                            <FormControl>
                              <Textarea
                                rows={5}
                                placeholder="Popište program a průběh akce."
                                maxLength={5000}
                                aria-required="true"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="min-h-0" />
                          </FormItem>
                        )}
                      />
                    </FieldSet>

                    <FieldSet>
                      <FieldLegend>
                        Podmínky účasti <FieldRequirement required={false} />
                      </FieldLegend>
                      <FormField
                        control={form.control}
                        name="conditions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="sr-only">Podmínky účasti</FormLabel>
                            <FormControl>
                              <Textarea
                                rows={3}
                                placeholder="Každou podmínku napište na samostatný řádek."
                                maxLength={2000}
                                aria-required="false"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Každou podmínku napište na samostatný řádek.
                            </FormDescription>
                            <FormMessage className="min-h-0" />
                          </FormItem>
                        )}
                      />
                    </FieldSet>
                  </div>

                  <FieldSet aria-describedby="public-contact-description">
                    <FieldLegend>
                      Veřejný kontakt{" "}
                      <Badge
                        aria-hidden="true"
                        variant="secondary"
                      >
                        Nepovinný
                      </Badge>
                    </FieldLegend>
                    <FieldDescription id="public-contact-description">
                      Každé pole je nepovinné. Vyplňte jen údaje, které chcete zveřejnit.
                    </FieldDescription>
                    <FormField
                      control={form.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <FormLabel>Jméno nebo název</FormLabel>
                            <FieldRequirement required={false} />
                          </div>
                          <FormControl>
                            <Input
                              placeholder="Jan Novák"
                              autoComplete="off"
                              aria-required="false"
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
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <FormLabel>E-mail</FormLabel>
                            <FieldRequirement required={false} />
                          </div>
                          <FormControl>
                            <Input
                              type="email"
                              autoComplete="off"
                              placeholder="jan.novak@example.cz"
                              aria-required="false"
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
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <FormLabel>Telefon</FormLabel>
                            <FieldRequirement required={false} />
                          </div>
                          <FormControl>
                            <Input
                              type="tel"
                              inputMode="tel"
                              autoComplete="off"
                              placeholder="+420 777 123 456"
                              aria-required="false"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </FieldSet>
                </div>

                {errorMessage ? <FormError message={errorMessage} /> : null}
                <div className="flex justify-end">
                  <PendingButton
                    type="submit"
                    isPending={isSaving}
                    disabled={!form.formState.isDirty}
                  >
                    {isSaving ? "Ukládám…" : "Uložit"}
                  </PendingButton>
                </div>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>
    </CollapsibleSection>
  )
}

function FieldRequirement({ required }: { required: boolean }) {
  return (
    <Badge
      aria-hidden="true"
      variant={required ? "outline" : "secondary"}
    >
      {required ? "Povinné" : "Nepovinné"}
    </Badge>
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
