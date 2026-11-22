import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { failOn } from "@/screens/msw"
import { eventUrl, organizerBackend, screenMeta } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

import { SCHOOL_ATTRIBUTE } from "@/features/accommodation/fixtures/evaluation"
import { accommodationHandlers } from "@/features/accommodation/fixtures/handlers"
import { registrationHandlers } from "@/features/registrations/fixtures/handlers"
import { MANAGED_QUESTIONS } from "@/features/registrations/fixtures/questions"

// Správa akce → Nastavení → Otázky v přihlášce (#485): the organizer's own
// categorical questions of the form, and a question as the hard attribute in
// Pravidla ubytování. MSW keeps every save in memory.

const QUESTIONS = "/organizations/:organizationId/events/:eventId/questions"

const meta = {
  title: "Screens/Event/Registration Questions",
  ...screenMeta,
  args: { url: eventUrl("/settings") },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>
type Canvas = StoryContext["canvas"]

const region = async (canvas: Canvas, name: string) =>
  within(await canvas.findByRole("region", { name }, { timeout: 5000 }))

const withQuestions: Pick<Story, "beforeEach"> = {
  beforeEach: ({ msw }) => {
    msw.use(...registrationHandlers.questions(MANAGED_QUESTIONS))
  },
}

/** No question yet: the empty state adds the first one, saved with its options. */
export const NoQuestions: Story = {
  play: async ({ canvas }) => {
    const section = await region(canvas, "Otázky v přihlášce")
    await expect(await section.findByText("Akce nemá vlastní otázky")).toBeVisible()
    await userEvent.click(section.getByRole("button", { name: "Přidat otázku" }))
    await userEvent.type(section.getByRole("textbox", { name: "Otázka 1" }), "Družina")
    await userEvent.type(section.getByRole("textbox", { name: "Družina, možnost 1" }), "Lišky")
    await userEvent.type(section.getByRole("textbox", { name: "Družina, možnost 2" }), "Vlci")
    await userEvent.click(section.getByRole("checkbox", { name: "Povinná odpověď" }))
    await userEvent.click(section.getByRole("button", { name: "Uložit" }))
    await showsText("Otázky přihlášky byly uloženy.")
    await expect(section.getByRole("button", { name: "Uložit" })).toBeDisabled()
  },
}

/**
 * An answered question used as the hard attribute: it stays, keeps every
 * option and says why; the other one can be removed.
 */
export const Questions: Story = {
  ...withQuestions,
  play: async ({ canvas }) => {
    const section = await region(canvas, "Otázky v přihlášce")
    await expect(await section.findByRole("textbox", { name: "Otázka 1" })).toHaveValue("Škola")
    await expect(
      section.getByText(
        "Pokoje se podle ní dělí v Pravidlech ubytování, proto ji nelze odebrat ani z ní odebrat možnost.",
      ),
    ).toBeVisible()
    await expect(section.getByRole("button", { name: "Odebrat Škola" })).toBeDisabled()
    await expect(section.getAllByText("Zvolená")).toHaveLength(2)
    await expect(section.getByRole("button", { name: "Odebrat Oddíl" })).toBeEnabled()
  },
}

/** A refusal (someone answered meanwhile) keeps the edits and gives the reason. */
export const SaveRefused: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      // The refusal first: the first matching handler answers.
      ...failOn("put", QUESTIONS, 409, {
        code: "question_answered",
        message: "Otázku „Oddíl“ nelze odebrat: účastníci na ni už odpověděli.",
      }),
      ...registrationHandlers.questions(MANAGED_QUESTIONS),
    )
  },
  play: async ({ canvas }) => {
    const section = await region(canvas, "Otázky v přihlášce")
    await userEvent.click(await section.findByRole("button", { name: "Odebrat Oddíl" }))
    await userEvent.click(section.getByRole("button", { name: "Uložit" }))
    await showsText("Otázky se nepodařilo uložit")
    await showsText(/Otázku „Oddíl“ nelze odebrat/)
    await expect(section.queryByRole("textbox", { name: "Otázka 2" })).not.toBeInTheDocument()
  },
}

export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", QUESTIONS))
  },
  play: () => showsText("Otázky přihlášky se nepodařilo načíst"),
}

/** A question as the hard attribute (#485): its answers that decide no room are chosen too. */
export const QuestionAsHardAttribute: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...accommodationHandlers.attributeRules([SCHOOL_ATTRIBUTE], "gender"))
  },
  play: async ({ canvas }) => {
    const rules = await region(canvas, "Pravidla ubytování")
    await userEvent.click(await rules.findByRole("radio", { name: "Škola" }))
    // A question has no answers that decide no room until chosen here.
    await expect(rules.getByRole("checkbox", { name: "Jiná škola" })).not.toBeChecked()
    await userEvent.click(rules.getByRole("checkbox", { name: "Jiná škola" }))
    await userEvent.click(rules.getByRole("button", { name: "Uložit" }))
    await showsText("Pravidla ubytování byla uložena.")
    await expect(rules.getByRole("radio", { name: "Škola" })).toBeChecked()
    await expect(rules.getByRole("checkbox", { name: "Jiná škola" })).toBeChecked()
  },
}
