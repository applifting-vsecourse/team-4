import type { StoryContext } from "@storybook/react-vite"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

// Recurring steps of screen story `play` functions. Dialogs and menus render
// in a portal outside the canvas, so they are looked up in the whole page.

type Canvas = StoryContext["canvas"]
type Name = string | RegExp

const TIMEOUT = { timeout: 5000 }

/** Clicks the button named `trigger` and returns the dialog it opens, once visible. */
export async function openDialog(canvas: Canvas, trigger: Name, dialog?: Name) {
  await userEvent.click(await canvas.findByRole("button", { name: trigger }, TIMEOUT))
  const opened = await screen.findByRole(
    "dialog",
    dialog === undefined ? {} : { name: dialog },
    TIMEOUT,
  )
  await waitFor(() => expect(opened).toBeVisible())
  return opened
}

/** Opens the action menu of a row (`Akce: <name>`) and returns the menu. */
export async function openRowMenu(canvas: Canvas, row: string) {
  await userEvent.click(await canvas.findByRole("button", { name: `Akce: ${row}` }, TIMEOUT))
  return screen.findByRole("menu", {}, TIMEOUT)
}

/** Clicks "Aktualizovat" once nothing is loading any more. */
export async function refresh(canvas: Canvas) {
  await userEvent.click(await canvas.findByRole("button", { name: "Aktualizovat" }, TIMEOUT))
}

/** Clicks the button named `button` inside a dialog. */
export async function submitDialog(dialog: HTMLElement, button: Name) {
  await userEvent.click(within(dialog).getByRole("button", { name: button }))
}

/** Play check: `text` is visible somewhere on the page (canvas or a portal), at least once. */
export async function showsText(text: Name) {
  const [first] = await screen.findAllByText(text, {}, TIMEOUT)
  // Dialogs and toasts fade in.
  await waitFor(() => expect(first).toBeVisible(), TIMEOUT)
}
