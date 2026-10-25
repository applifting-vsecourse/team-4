import { expect as baseExpect, test, type Locator, type Page } from "@playwright/test"

import { EXTRA_VIDEO_DIR, isRecording, RECORDING_SIZE } from "./recording"
import { DEMO_TYPING_DELAY } from "./speed"

// One scenario, two audiences. As a test it runs headless and fast. With
// DEMO=1 it becomes a guided walkthrough: every `step` shows a caption in the
// page and then pauses in the Playwright Inspector until the presenter
// presses Resume, `type` types visibly instead of pasting, and whatever the
// scenario clicks, fills or checks is first scrolled smoothly into the middle
// of the window. DEMO_PAUSE=0 plays it through without pauses.

export const isDemo = process.env.DEMO === "1"
/** DEMO_PAUSE=0 plays the walkthrough through without stopping (autoplay). */
const shouldPause = isDemo && process.env.DEMO_PAUSE !== "0"

/**
 * Options for extra browser contexts (another person's window). In a demo
 * the page follows the window size, like the main page, instead of a fixed
 * 1280×720 viewport; a recorded demo saves this window's video too.
 */
export const contextOptions = {
  locale: "cs-CZ",
  timezoneId: "Europe/Prague",
  ...(isRecording
    ? {
        viewport: RECORDING_SIZE,
        recordVideo: { dir: EXTRA_VIDEO_DIR, size: RECORDING_SIZE },
      }
    : isDemo
      ? { viewport: null }
      : {}),
}

const CAPTION_ID = "e2e-demo-caption"
/** Space kept free at the window edges; the caption sits at the bottom. */
const EDGE_MARGIN = 96
/** Upper bound for one smooth scroll; long ones take Chrome over a second. */
const SMOOTH_SCROLL_TIMEOUT_MS = 2_500

/**
 * Smoothly scrolls the first element of `locator` to the middle of the window
 * unless it is already well inside it. Best effort: an element that does not
 * appear soon is left to the action or assertion that follows.
 */
async function reveal(locator: Locator) {
  await locator
    .first()
    .evaluate(
      (element, { margin, timeout }) => {
        const box = element.getBoundingClientRect()
        if (box.top >= margin && box.bottom <= window.innerHeight - margin) return
        // Resolves when the smooth scroll has finished, whatever its length.
        const scrolled = new Promise<void>((resolve) => {
          window.addEventListener("scrollend", () => resolve(), { capture: true, once: true })
          setTimeout(resolve, timeout)
        })
        element.scrollIntoView({ behavior: "smooth", block: "center" })
        return scrolled
      },
      { margin: EDGE_MARGIN, timeout: SMOOTH_SCROLL_TIMEOUT_MS },
      { timeout: 2_000 },
    )
    .catch(() => undefined)
}

const REVEALED_ACTIONS = [
  "check",
  "clear",
  "click",
  "dblclick",
  "fill",
  "hover",
  "press",
  "pressSequentially",
  "selectOption",
  "uncheck",
] as const

let hasRevealingActions = false

// Playwright scrolls before an action too, but it jumps and stops at the
// window edge, under the caption. Locator is not exported as a value, so the
// prototype comes from an instance; demo mode only.
function revealBeforeActions(page: Page) {
  if (hasRevealingActions) return
  hasRevealingActions = true
  const prototype = Object.getPrototypeOf(page.locator("html")) as Record<
    string,
    (this: Locator, ...args: unknown[]) => Promise<unknown>
  >
  for (const name of REVEALED_ACTIONS) {
    const action = prototype[name]!
    prototype[name] = async function (this: Locator, ...args: unknown[]) {
      await reveal(this)
      return action.apply(this, args)
    }
  }
}

const isLocator = (value: unknown): value is Locator =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Locator).evaluate === "function" &&
  typeof (value as Locator).first === "function"

// Assertions about something disappearing have nothing to show.
const UNREVEALED_MATCHERS = new Set<PropertyKey>(["not", "toBeHidden"])

function revealingMatchers<T extends object>(matchers: T, locator: Locator): T {
  return new Proxy(matchers, {
    get(target, property, receiver) {
      const value: unknown = Reflect.get(target, property, receiver)
      if (typeof value !== "function" || UNREVEALED_MATCHERS.has(property)) return value
      return async (...args: unknown[]) => {
        await reveal(locator)
        return (value as (...a: unknown[]) => unknown).apply(target, args)
      }
    },
  })
}

/**
 * Playwright's `expect`. In demo mode a locator assertion first scrolls its
 * element into view, so the audience sees what is being checked.
 */
export const expect: typeof baseExpect = isDemo
  ? new Proxy(baseExpect, {
      apply(target, thisArg, args: unknown[]) {
        const matchers = Reflect.apply(target, thisArg, args) as object
        return isLocator(args[0]) ? revealingMatchers(matchers, args[0]) : matchers
      },
    })
  : baseExpect

const captions = new WeakMap<Page, string>()

// A full page load (goto, reload) replaces the document and with it the
// caption, so each page restores its current caption after every load.
async function showCaption(page: Page, text: string) {
  if (!captions.has(page)) {
    page.on("load", () => {
      const current = captions.get(page)
      if (current) void renderCaption(page, current).catch(() => undefined)
    })
  }
  captions.set(page, text)
  await renderCaption(page, text)
}

async function renderCaption(page: Page, text: string) {
  await page.evaluate(
    ({ id, text }) => {
      let caption = document.getElementById(id)
      if (!caption) {
        caption = document.createElement("div")
        caption.id = id
        caption.setAttribute("aria-hidden", "true")
        Object.assign(caption.style, {
          position: "fixed",
          left: "50%",
          bottom: "24px",
          transform: "translateX(-50%)",
          zIndex: "2147483647",
          padding: "10px 18px",
          borderRadius: "999px",
          background: "rgba(17, 24, 39, 0.9)",
          color: "#f9fafb",
          font: "500 16px/1.4 system-ui, sans-serif",
          pointerEvents: "none",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
        })
        document.body.appendChild(caption)
      }
      caption.textContent = text
    },
    { id: CAPTION_ID, text },
  )
}

/**
 * A named step of the scenario. In demo mode it captions the page while the
 * step runs and pauses afterwards, unless `pause: false`.
 */
export async function step<T>(
  page: Page,
  title: string,
  body: () => Promise<T>,
  { pause = true }: { pause?: boolean } = {},
): Promise<T> {
  return test.step(title, async () => {
    if (isDemo) {
      revealBeforeActions(page)
      await showCaption(page, title)
    }
    const result = await body()
    if (shouldPause && pause) await page.pause()
    return result
  })
}

/** Fills a field; in demo mode types it key by key so the audience sees it. */
export async function type(field: Locator, text: string) {
  if (isDemo) {
    await field.clear()
    await field.pressSequentially(text, { delay: DEMO_TYPING_DELAY })
  } else {
    await field.fill(text)
  }
}
