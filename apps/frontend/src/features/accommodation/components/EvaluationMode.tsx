import { CircleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export type EvaluationModeValue = "automatic" | "manual"

type EvaluationModeProps = {
  /** The saved mode; the form starts on it. */
  mode: EvaluationModeValue
  /** A failed save, already worded. */
  saveError?: string
}

// Správa akce → Nastavení → Automatizace (F13-1): how the proposal of the
// evaluation is updated. Design only: the saved mode is passed in.
export function EvaluationMode({ mode, saveError }: EvaluationModeProps) {
  return (
    <section aria-labelledby="evaluation-mode-heading">
      <h2
        id="evaluation-mode-heading"
        className="mb-4 text-h4"
      >
        Automatizace
      </h2>
      <Card>
        <CardContent>
          <div className="space-y-4">
            <RadioGroup
              defaultValue={mode}
              aria-label="Aktualizace návrhu vyhodnocení"
            >
              <FieldLabel htmlFor="evaluation-mode-automatic">
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldTitle>Automatický režim</FieldTitle>
                    <FieldDescription>
                      Návrh se po změně podkladů přepočítá sám zhruba za 10 sekund.
                    </FieldDescription>
                  </FieldContent>
                  <RadioGroupItem
                    value="automatic"
                    id="evaluation-mode-automatic"
                    aria-label="Automatický režim"
                  />
                </Field>
              </FieldLabel>
              <FieldLabel htmlFor="evaluation-mode-manual">
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldTitle>Ruční režim</FieldTitle>
                    <FieldDescription>
                      Návrh se přepočítá, až když to organizátor vyžádá tlačítkem Přepočítat.
                    </FieldDescription>
                  </FieldContent>
                  <RadioGroupItem
                    value="manual"
                    id="evaluation-mode-manual"
                    aria-label="Ruční režim"
                  />
                </Field>
              </FieldLabel>
            </RadioGroup>

            {saveError ? (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>Režim se nepodařilo uložit</AlertTitle>
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex justify-end">
              <Button>Uložit</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
