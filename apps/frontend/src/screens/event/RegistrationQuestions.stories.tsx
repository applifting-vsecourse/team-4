import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

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
  args: { url: `${eventUrl("/settings")}?tab=registration` },
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
    const label = section.getByRole("textbox", { name: "Znění otázky" })
    await expect(label).toHaveFocus()
    await expect(label).toHaveAttribute("placeholder", "Např. Jaké máte zkušenosti s turistikou?")
    await userEvent.type(label, "Družina")
    const options = section.getAllByRole("textbox")
    await expect(options[1]).toHaveAttribute("placeholder", "Např. Začátečník")
    await expect(options[2]).toHaveAttribute("placeholder", "Např. Pokročilý")
    await userEvent.type(options[1]!, "Lišky")
    await userEvent.type(options[2]!, "Vlci")
    await userEvent.click(section.getByRole("checkbox", { name: "Povinná odpověď" }))
    await userEvent.click(section.getByRole("button", { name: "Uložit otázky" }))
    await showsText("Otázky přihlášky byly uloženy.")
    await expect(section.getByRole("button", { name: "Uložit otázky" })).toBeDisabled()
  },
}

/**
 * An answered question used as the hard attribute: it stays, keeps every
 * option and says why; the other one can be removed.
 */
export const Questions: Story = {
  ...withQuestions,
  globals: { theme: "dark" },
  play: async ({ canvas }) => {
    const section = await region(canvas, "Otázky v přihlášce")
    await section.findByRole("button", { name: /Škola.*3 možnosti/ })
    const list = section.getByRole("list")
    const rows = within(list).getAllByRole("listitem")
    await expect(rows).toHaveLength(2)
    await expect(rows[0]).toHaveTextContent("Škola")
    await expect(rows[0]).toHaveTextContent("3 možnosti")
    await expect(rows[1]).toHaveTextContent("2 možnosti")
    await expect(section.queryByRole("textbox", { name: "Znění otázky" })).not.toBeInTheDocument()
    await userEvent.click(section.getByRole("button", { name: /Škola.*3 možnosti/ }))
    await expect(section.getByRole("textbox", { name: "Znění otázky" })).toHaveValue("Škola")
    await expect(
      section.getByText(
        "Pokoje se podle ní dělí v Pravidlech ubytování, proto ji nelze odebrat ani z ní odebrat možnost.",
      ),
    ).toBeVisible()
    await expect(section.getByRole("button", { name: "Odebrat Škola" })).toBeDisabled()
    // Rooms are split by it, so it stays required (PO feedback).
    const schoolRequired = section.getByRole("checkbox", { name: "Povinná odpověď" })
    await expect(schoolRequired).toBeChecked()
    await expect(schoolRequired).toBeDisabled()
    await expect(section.getAllByText("Zvolená")).toHaveLength(2)
    const removeQuestion = section.getByRole("button", { name: "Odebrat Oddíl" })
    await expect(removeQuestion).toBeEnabled()
    removeQuestion.focus()
    await expect(await within(document.body).findByRole("tooltip")).toHaveTextContent(
      "Odebrat otázku",
    )
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(within(document.body).queryByRole("tooltip")).not.toBeInTheDocument(),
    )
    await userEvent.click(section.getByRole("button", { name: /Oddíl.*2 možnosti/ }))
    await expect(section.getByRole("checkbox", { name: "Povinná odpověď" })).toBeEnabled()
  },
}

/** New questions open immediately, focus the label, and show all answer placeholders. */
export const AddQuestion: Story = {
  ...withQuestions,
  globals: { theme: "light" },
  play: async ({ canvas }) => {
    const section = await region(canvas, "Otázky v přihlášce")
    await userEvent.click(await section.findByRole("button", { name: "Přidat otázku" }))
    const label = section.getByRole("textbox", { name: "Znění otázky" })
    await expect(label).toHaveFocus()
    await expect(label).toHaveAttribute("placeholder", "Např. Jaké máte zkušenosti s turistikou?")
    await expect(section.getByRole("textbox", { name: "Možnost 1" })).toHaveAttribute(
      "placeholder",
      "Např. Začátečník",
    )
    await expect(section.getByRole("textbox", { name: "Možnost 2" })).toHaveAttribute(
      "placeholder",
      "Např. Pokročilý",
    )
    await expect(section.getByText("Možnosti odpovědi")).toBeVisible()
    await expect(section.getByText("2–10 možností")).toBeVisible()
  },
}

/** The preference handle pattern also reorders questions with the keyboard. */
export const ReorderQuestions: Story = {
  ...withQuestions,
  globals: { theme: "light" },
  play: async ({ canvas }) => {
    const section = await region(canvas, "Otázky v přihlášce")
    const handle = await section.findByRole("button", { name: "Přesunout Oddíl" })
    handle.focus()
    await expect(await within(document.body).findByRole("tooltip")).toHaveTextContent(
      "Přetažením změnit pořadí",
    )
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(within(document.body).queryByRole("tooltip")).not.toBeInTheDocument(),
    )
    await userEvent.click(handle)
    await userEvent.keyboard(" {ArrowUp} ")
    const headers = within(section.getByRole("list")).getAllByRole("button", { name: /možnosti/ })
    await expect(headers[0]).toHaveTextContent("Oddíl")
    await expect(headers[1]).toHaveTextContent("Škola")
    const remove = section.getByRole("button", { name: "Odebrat Oddíl" })
    await userEvent.click(remove)
    await expect(section.queryByRole("button", { name: "Odebrat Oddíl" })).not.toBeInTheDocument()
  },
}

/** An invalid answer is found after save and opens even when its question was collapsed. */
export const ValidationOpensCollapsedQuestion: Story = {
  ...withQuestions,
  globals: { theme: "dark" },
  play: async ({ canvas }) => {
    const section = await region(canvas, "Otázky v přihlášce")
    const header = await section.findByRole("button", { name: /Oddíl.*2 možnosti/ })
    await userEvent.click(header)
    const option = section.getByRole("textbox", { name: "Možnost 2" })
    await userEvent.clear(option)
    await userEvent.click(header)
    await userEvent.click(section.getByRole("button", { name: "Uložit otázky" }))
    const invalidOption = section.getByRole("textbox", { name: "Možnost 2" })
    await expect(invalidOption).toHaveAttribute("aria-invalid", "true")
    await expect(invalidOption).toHaveFocus()
    await expect(section.getByText("Vyplňte všechny možnosti odpovědi.")).toBeVisible()
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
    await userEvent.click(section.getByRole("button", { name: "Uložit otázky" }))
    await showsText("Otázky se nepodařilo uložit")
    await showsText(/Otázku „Oddíl“ nelze odebrat/)
    await expect(section.queryByRole("button", { name: /Oddíl/ })).not.toBeInTheDocument()
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
  args: { url: `${eventUrl("/settings")}?tab=accommodation` },
  beforeEach: ({ msw }) => {
    msw.use(...accommodationHandlers.attributeRules([SCHOOL_ATTRIBUTE], SCHOOL_ATTRIBUTE.attribute))
  },
  play: async ({ canvas }) => {
    const rules = await region(canvas, "Pravidla ubytování")
    const select = await rules.findByRole("combobox", { name: "Pokoje dělit podle" })
    const save = rules.getByRole("button", { name: "Uložit pravidlo" })
    await expect(select).toHaveTextContent("Škola")
    await expect(rules.getByText("Různé odpovědi znamenají oddělené pokoje.")).toBeVisible()
    const exceptions = rules.getByRole("button", { name: /Komu určit pokoj ručně/ })
    await expect(exceptions).toHaveTextContent("Chybějící odpověď")
    await userEvent.click(exceptions)
    await expect(
      rules.getByText("Účastníkům bez vyplněné odpovědi určíte pokoj vždy ručně."),
    ).toBeVisible()
    // A question has no answers that decide no room until chosen here.
    const exception = rules.getByRole("checkbox", { name: "Jiná škola", hidden: true })
    await expect(exception).not.toBeChecked()
    await userEvent.click(exception)
    await expect(exceptions).toHaveTextContent("Jiná škola")
    await expect(exceptions).toHaveTextContent("Chybějící odpověď")
    await userEvent.click(save)
    await showsText("Pravidla ubytování byla uložena.")
    await expect(
      await rules.findByRole("combobox", { name: "Pokoje dělit podle" }),
    ).toHaveTextContent("Škola")
    await expect(exception).toBeChecked()
  },
}
