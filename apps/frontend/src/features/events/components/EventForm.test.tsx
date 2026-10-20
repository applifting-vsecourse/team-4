import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { EventForm } from "@/features/events/components/EventForm"

function renderForm(props: Partial<Parameters<typeof EventForm>[0]> = {}) {
  const onSubmit = vi.fn()
  const onCancel = vi.fn()
  render(
    <EventForm
      submitLabel="Vytvořit akci"
      isLoading={false}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...props}
    />,
  )
  return { onSubmit, onCancel }
}

describe("EventForm", () => {
  it("requires name, location and description", async () => {
    const { onSubmit } = renderForm()
    await userEvent.click(screen.getByRole("button", { name: "Vytvořit akci" }))
    expect(await screen.findByText("Vyplňte název akce.")).toBeInTheDocument()
    expect(screen.getByText("Vyplňte místo.")).toBeInTheDocument()
    expect(screen.getByText("Vyplňte popis.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("shows the saved values when editing and submits the trimmed changes", async () => {
    const { onSubmit } = renderForm({
      submitLabel: "Uložit změny",
      initialValues: { name: "Tábor", location: "Podlesí", description: "Letní tábor" },
    })
    expect(screen.getByLabelText("Název akce")).toHaveValue("Tábor")
    expect(screen.getByLabelText("Místo")).toHaveValue("Podlesí")
    expect(screen.getByLabelText("Popis")).toHaveValue("Letní tábor")

    await userEvent.type(screen.getByLabelText("Název akce"), " 2027 ")
    await userEvent.click(screen.getByRole("button", { name: "Uložit změny" }))
    expect(onSubmit).toHaveBeenCalledWith(
      { name: "Tábor 2027", location: "Podlesí", description: "Letní tábor" },
      expect.anything(),
    )
  })

  it("keeps the values and shows the error after a failed save", () => {
    renderForm({
      initialValues: { name: "Tábor", location: "Podlesí", description: "Popis" },
      errorMessage: "Akci se nepodařilo vytvořit. Zkuste to prosím znovu.",
    })
    expect(screen.getByRole("alert")).toHaveTextContent("Akci se nepodařilo vytvořit.")
    expect(screen.getByLabelText("Název akce")).toHaveValue("Tábor")
  })

  it("cancels without saving", async () => {
    const { onSubmit, onCancel } = renderForm()
    await userEvent.click(screen.getByRole("button", { name: "Zrušit" }))
    expect(onCancel).toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
