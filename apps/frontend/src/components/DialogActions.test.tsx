import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { DialogActions } from "@/components/DialogActions"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

function renderInDialog(children: React.ReactNode) {
  return render(
    <Dialog open>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>Dialog</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>,
  )
}

describe("DialogActions", () => {
  it("submits the dialog's form without an onSubmit", async () => {
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault())
    renderInDialog(
      <form onSubmit={submit}>
        <DialogActions
          submitLabel="Uložit termín"
          isPending={false}
        />
      </form>,
    )

    await userEvent.click(screen.getByRole("button", { name: "Uložit termín" }))

    expect(submit).toHaveBeenCalledOnce()
    expect(screen.getByRole("button", { name: "Zrušit" })).toBeEnabled()
  })

  it("calls onSubmit and is disabled while pending", async () => {
    const onSubmit = vi.fn()
    const { rerender } = renderInDialog(
      <DialogActions
        submitLabel="Odstranit"
        isPending={false}
        onSubmit={onSubmit}
        submitVariant="destructive"
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Odstranit" }))
    expect(onSubmit).toHaveBeenCalledOnce()

    rerender(
      <Dialog open>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Dialog</DialogTitle>
          <DialogActions
            submitLabel="Odstranit"
            isPending
            onSubmit={onSubmit}
          />
        </DialogContent>
      </Dialog>,
    )
    expect(screen.getByRole("button", { name: "Odstranit" })).toBeDisabled()
  })
})
