import type { Meta, StoryObj } from "@storybook/react-vite"

import { OrganizerEventPage } from "@/screens/designs/OrganizerEventPage"

import {
  EvaluationModeSettings,
  type EvaluationModeSettingsProps,
} from "@/features/accommodation/components/EvaluationModeSettings"

// Design of the evaluation mode (F13-1; spec v4 §5) in Správa akce →
// Nastavení → Automatizace: the saved mode is what the form starts on.
// Static only: no router, queries or API; every value is hard-coded.

function Settings(props: EvaluationModeSettingsProps) {
  return (
    <OrganizerEventPage
      section="Nastavení"
      crumbs={["Nastavení"]}
    >
      <EvaluationModeSettings {...props} />
    </OrganizerEventPage>
  )
}

const meta = {
  title: "Designs/F13-1 Evaluation mode",
  component: Settings,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: { mode: "automatic" },
} satisfies Meta<typeof Settings>

export default meta

type Story = StoryObj<typeof meta>

/** Saved automatic mode: a term recalculates after each change of its inputs. */
export const Automatic: Story = {}

/** Saved manual mode: a term recalculates only from "Přepočítat". */
export const Manual: Story = { args: { mode: "manual" } }

/** The save failed: the saved mode stays and the error is shown. */
export const SaveFailed: Story = {
  args: {
    mode: "manual",
    saveError: "Režim se nepodařilo uložit. Platí dál automatický přepočet.",
  },
}
