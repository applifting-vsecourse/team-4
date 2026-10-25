import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { describe, expect, it } from "vitest"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

function NameForm() {
  const form = useForm({ defaultValues: { name: "" } })
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => undefined)}>
        <FormField
          control={form.control}
          name="name"
          rules={{ required: "Zadejte název." }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Název</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Uložit</Button>
      </form>
    </Form>
  )
}

describe("FormMessage", () => {
  it("keeps its line before any error, so the fields below do not move when one appears", async () => {
    const { container } = render(<NameForm />)
    const message = container.querySelector('[data-slot="form-message"]')
    expect(message).toBeInTheDocument()
    expect(message).toBeEmptyDOMElement()

    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))
    expect(await screen.findByText("Zadejte název.")).toBe(message)
  })
})
