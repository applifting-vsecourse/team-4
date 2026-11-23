import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { TooltipProvider } from "@/components/ui/tooltip"

import { RegistrationQuestionsSettings } from "@/features/registrations/components/RegistrationQuestionsSettings"
import { MANAGED_QUESTIONS } from "@/features/registrations/fixtures/questions"

const [SCHOOL, TROOP] = MANAGED_QUESTIONS

describe("RegistrationQuestionsSettings", () => {
  // A reload after a refused save or on focus refreshes what protects a
  // question; the organizer's unsaved edits stay (#485).
  it("keeps the edits when the questions are read again", async () => {
    const { rerender } = render(
      <TooltipProvider>
        <RegistrationQuestionsSettings questions={MANAGED_QUESTIONS} />
      </TooltipProvider>,
    )
    await userEvent.click(screen.getByRole("button", { name: /Oddíl.*2 možnosti/ }))
    const label = screen.getByRole("textbox", { name: "Znění otázky" })
    await userEvent.clear(label)
    await userEvent.type(label, "Družina")
    expect(screen.getByRole("button", { name: "Odebrat Družina" })).toBeEnabled()

    const chosen = {
      ...TROOP!,
      isAnswered: true,
      options: TROOP!.options.map((option, index) => ({ ...option, isChosen: index === 0 })),
    }
    rerender(
      <TooltipProvider>
        <RegistrationQuestionsSettings questions={[SCHOOL!, chosen]} />
      </TooltipProvider>,
    )

    await userEvent.click(screen.getByRole("button", { name: /Škola.*3 možnosti/ }))
    expect(screen.getByRole("textbox", { name: "Znění otázky" })).toHaveValue("Škola")
    expect(screen.getAllByText("Zvolená")).toHaveLength(2)
    await userEvent.click(screen.getByRole("button", { name: /Družina.*2 možnosti/ }))
    expect(screen.getByRole("textbox", { name: "Znění otázky" })).toHaveValue("Družina")
    expect(screen.getAllByText("Zvolená")).toHaveLength(1)
    expect(screen.getByRole("button", { name: "Odebrat Družina" })).toBeDisabled()
  })
})
