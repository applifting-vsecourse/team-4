import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { RegistrationQuestionsSettings } from "@/features/registrations/components/RegistrationQuestionsSettings"
import { MANAGED_QUESTIONS } from "@/features/registrations/fixtures/questions"

const [SCHOOL, TROOP] = MANAGED_QUESTIONS

describe("RegistrationQuestionsSettings", () => {
  // A reload after a refused save or on focus refreshes what protects a
  // question; the organizer's unsaved edits stay (#485).
  it("keeps the edits when the questions are read again", async () => {
    const { rerender } = render(<RegistrationQuestionsSettings questions={MANAGED_QUESTIONS} />)
    const label = screen.getByRole("textbox", { name: /^Otázka 2$/ })
    await userEvent.clear(label)
    await userEvent.type(label, "Družina")
    expect(screen.getByRole("button", { name: "Odebrat Družina" })).toBeEnabled()
    expect(screen.getAllByText("Zvolená")).toHaveLength(2)

    const chosen = {
      ...TROOP!,
      isAnswered: true,
      options: TROOP!.options.map((option, index) => ({ ...option, isChosen: index === 0 })),
    }
    rerender(<RegistrationQuestionsSettings questions={[SCHOOL!, chosen]} />)

    expect(screen.getByRole("textbox", { name: /^Otázka 2$/ })).toHaveValue("Družina")
    expect(screen.getAllByText("Zvolená")).toHaveLength(3)
    expect(screen.getByRole("button", { name: "Odebrat Družina" })).toBeDisabled()
  })
})
