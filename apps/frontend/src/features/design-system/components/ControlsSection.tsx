import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { PendingButton } from "@/components/PendingButton"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

import { ShowcaseItem, ShowcaseSection } from "./ShowcaseSection"

const BUTTON_VARIANTS = ["default", "secondary", "outline", "ghost", "link", "destructive"] as const

const LONG_TEXT =
  "Letní dobrodružný tábor pro dospělé s velmi dlouhým názvem, který se nevejde na jeden řádek"

const schema = z.object({
  firstName: z.string().trim().min(1, "Vyplňte jméno"),
  email: z.string().trim().min(1, "Vyplňte e-mail").email("Zadejte platný e-mail"),
  term: z.string().min(1, "Vyberte turnus"),
  consent: z.boolean().refine((isChecked) => isChecked, "Bez souhlasu nelze přihlášku odeslat"),
})

type FormValues = z.infer<typeof schema>

const defaultValues: FormValues = {
  firstName: "",
  email: "",
  term: "",
  consent: false,
}

function ValidationForm() {
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues })

  return (
    <Form {...form}>
      <form
        noValidate
        className="max-w-md space-y-4"
        onSubmit={form.handleSubmit(() => {
          toast.success("Přihláška odeslána")
        })}
      >
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jméno</FormLabel>
              <FormControl>
                <Input
                  autoComplete="given-name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormDescription>Pošleme na něj potvrzení a platební údaje.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="term"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Turnus</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Vyberte turnus" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1">1. turnus · 5.–12. 7. · 4 500 Kč</SelectItem>
                  <SelectItem value="2">2. turnus · 12.–19. 7. · 4 500 Kč</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="consent"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-start gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                </FormControl>
                <FormLabel className="leading-snug font-normal">
                  Souhlasím se zpracováním osobních údajů
                </FormLabel>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Odeslat přihlášku</Button>
      </form>
    </Form>
  )
}

function DatePickerDemo() {
  const [value, setValue] = useState("")
  return (
    <Field>
      <FieldLabel htmlFor="ds-date">Začátek</FieldLabel>
      <DatePicker
        id="ds-date"
        value={value}
        onChange={setValue}
      />
    </Field>
  )
}

export function ControlsSection() {
  return (
    <>
      <ShowcaseSection
        id="buttons"
        title="Tlačítka"
      >
        <div className="flex flex-wrap gap-3">
          {BUTTON_VARIANTS.map((variant) => (
            <Button
              key={variant}
              variant={variant}
            >
              {variant}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Malé</Button>
          <Button>Výchozí</Button>
          <Button size="lg">Velké</Button>
          <Button>
            <Plus /> Nová přihláška
          </Button>
          <Button
            size="icon"
            variant="outline"
            aria-label="Odstranit"
          >
            <Trash2 />
          </Button>
          <Button disabled>Zakázané</Button>
          <PendingButton isPending>Ukládám…</PendingButton>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        id="inputs"
        title="Formulářové prvky"
        description="Tabulátorem projděte prvky a zkontrolujte viditelné zaměření."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <ShowcaseItem label="Input">
            <Field>
              <FieldLabel htmlFor="ds-input">Název akce</FieldLabel>
              <Input
                id="ds-input"
                placeholder="Letní tábor 2027"
              />
            </Field>
          </ShowcaseItem>
          <ShowcaseItem label="Input · disabled">
            <Field>
              <FieldLabel htmlFor="ds-input-disabled">Variabilní symbol</FieldLabel>
              <Input
                id="ds-input-disabled"
                value="2027000142"
                disabled
                readOnly
              />
            </Field>
          </ShowcaseItem>
          <ShowcaseItem label="Input · aria-invalid">
            <Field data-invalid="true">
              <FieldLabel htmlFor="ds-input-invalid">E-mail</FieldLabel>
              <Input
                id="ds-input-invalid"
                defaultValue="jana.novakova@"
                aria-invalid
                aria-describedby="ds-input-invalid-msg"
              />
              <FieldError id="ds-input-invalid-msg">Zadejte platný e-mail</FieldError>
            </Field>
          </ShowcaseItem>
          <ShowcaseItem label="Input · dlouhý text">
            <Field>
              <FieldLabel htmlFor="ds-input-long">Název</FieldLabel>
              <Input
                id="ds-input-long"
                defaultValue={LONG_TEXT}
              />
            </Field>
          </ShowcaseItem>
          <ShowcaseItem label="Select">
            <Field>
              <FieldLabel htmlFor="ds-select">Organizace</FieldLabel>
              <Select>
                <SelectTrigger
                  id="ds-select"
                  className="w-full"
                >
                  <SelectValue placeholder="Vyberte organizaci" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a">Skautské středisko Javor</SelectItem>
                  <SelectItem value="b">{LONG_TEXT}</SelectItem>
                  <SelectItem
                    value="c"
                    disabled
                  >
                    Archivovaná organizace
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </ShowcaseItem>
          <ShowcaseItem label="Textarea">
            <Field>
              <FieldLabel htmlFor="ds-textarea">Poznámka</FieldLabel>
              <Textarea
                id="ds-textarea"
                placeholder="Alergie, strava, …"
              />
            </Field>
          </ShowcaseItem>
          <ShowcaseItem label="Checkbox">
            <div className="space-y-2">
              <Field orientation="horizontal">
                <Checkbox
                  id="ds-checkbox"
                  defaultChecked
                />
                <FieldLabel htmlFor="ds-checkbox">Zobrazit náhradníky</FieldLabel>
              </Field>
              <Field orientation="horizontal">
                <Checkbox
                  id="ds-checkbox-disabled"
                  disabled
                />
                <FieldLabel htmlFor="ds-checkbox-disabled">Zakázané</FieldLabel>
              </Field>
            </div>
          </ShowcaseItem>
          <ShowcaseItem label="RadioGroup">
            <RadioGroup
              defaultValue="transfer"
              aria-label="Způsob platby"
            >
              <Field orientation="horizontal">
                <RadioGroupItem
                  id="ds-radio-transfer"
                  value="transfer"
                />
                <FieldLabel htmlFor="ds-radio-transfer">Bankovní převod</FieldLabel>
              </Field>
              <Field orientation="horizontal">
                <RadioGroupItem
                  id="ds-radio-cash"
                  value="cash"
                />
                <FieldLabel htmlFor="ds-radio-cash">Hotově na místě</FieldLabel>
              </Field>
            </RadioGroup>
          </ShowcaseItem>
          <ShowcaseItem label="Switch">
            <div className="space-y-2">
              <Field orientation="horizontal">
                <Switch
                  id="ds-switch"
                  defaultChecked
                />
                <FieldLabel htmlFor="ds-switch">Přihlášky otevřené</FieldLabel>
              </Field>
              <Field orientation="horizontal">
                <Switch
                  id="ds-switch-disabled"
                  disabled
                />
                <FieldLabel htmlFor="ds-switch-disabled">Zakázané</FieldLabel>
              </Field>
            </div>
          </ShowcaseItem>
          <ShowcaseItem label="DatePicker">
            <DatePickerDemo />
          </ShowcaseItem>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        id="form"
        title="Validace formuláře"
        description="Odešlete prázdný formulář: chyby se zobrazí u polí a vyplněné hodnoty zůstanou."
      >
        <ValidationForm />
      </ShowcaseSection>
    </>
  )
}
