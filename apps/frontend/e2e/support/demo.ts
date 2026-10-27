import {
  expect as baseExpect,
  test,
  type Frame,
  type Locator,
  type Page,
  type Request,
} from "@playwright/test"

import { DemoHistory } from "./demo-history"
import { EXTRA_VIDEO_DIR, isRecording, RECORDING_SIZE } from "./recording"
import {
  DEMO_NAVIGATION_HOLD,
  DEMO_SCROLL_DURATION,
  DEMO_SCROLL_HOLD,
  DEMO_SUBMIT_HOLD,
  DEMO_TYPING_DELAY,
} from "./speed"

// One scenario, two audiences. As a test it runs headless and fast. With
// DEMO=1 it becomes a guided walkthrough: every `step` first shows its caption
// in the page and waits until the presenter presses → or PageDown (a slide
// clicker) or clicks "Spustit" in the caption, and only then acts. `type` types
// visibly instead of pasting, and whatever the scenario clicks, fills or
// checks is first scrolled smoothly into the middle of the window.
// DEMO_PAUSE=0 plays it through without pauses.

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

const quickDemoPages = new WeakSet<Page>()

/** Limit faster pacing to a single sequence, restoring the normal pace afterwards. */
export async function withQuickDemoPace<T>(page: Page, body: () => Promise<T>): Promise<T> {
  const isAlreadyQuick = quickDemoPages.has(page)
  if (isDemo) quickDemoPages.add(page)
  try {
    return await body()
  } finally {
    if (!isAlreadyQuick) quickDemoPages.delete(page)
  }
}

function pacing(page: Page) {
  return quickDemoPages.has(page)
    ? { navigation: 350, scroll: 500, afterScroll: 250, afterSubmit: 500, typing: 25 }
    : {
        navigation: DEMO_NAVIGATION_HOLD,
        scroll: DEMO_SCROLL_DURATION,
        afterScroll: DEMO_SCROLL_HOLD,
        afterSubmit: DEMO_SUBMIT_HOLD,
        typing: DEMO_TYPING_DELAY,
      }
}

const CAPTION_ID = "e2e-demo-caption"
const history = new DemoHistory()
const presenterPages = new WeakSet<Page>()
let isPlaybackPaused = false
const playbackPages = new Set<Page>()
const resumeWaiters = new Set<() => void>()

/** Stops between browser actions; an already submitted action can finish. */
async function waitForPlayback() {
  if (!isPlaybackPaused) return
  await new Promise<void>((resolve) => resumeWaiters.add(resolve))
}

async function updatePlaybackStatus(page: Page) {
  await page.evaluate(
    ({ id, isPaused, reviewTitle }) => {
      document.documentElement.dataset.demoPaused = String(isPaused)
      const caption = document.getElementById(id)
      if (!caption) return
      const title = caption.dataset.title ?? ""
      if (caption.firstChild) {
        caption.firstChild.textContent =
          reviewTitle ?? (isPaused ? `⏸ Pauza · Alt+P pokračovat · ${title}` : title)
      }
    },
    { id: CAPTION_ID, isPaused: isPlaybackPaused, reviewTitle: history.reviewTitle },
  )
}

async function installPlaybackControls(page: Page) {
  if (playbackPages.has(page)) return
  playbackPages.add(page)
  page.once("close", () => {
    playbackPages.delete(page)
    if (playbackPages.size === 0) history.clear()
  })
  await page.exposeBinding("__demoTogglePlayback", async () => {
    if (history.isReviewing) return
    isPlaybackPaused = !isPlaybackPaused
    await Promise.all(
      [...playbackPages].map((target) => updatePlaybackStatus(target).catch(() => undefined)),
    )
    if (!isPlaybackPaused) {
      for (const resume of resumeWaiters) resume()
      resumeWaiters.clear()
    }
  })
  await page.exposeBinding("__demoNavigate", async (_source, key: string) => {
    if (!presenterPages.has(page)) return
    if (["ArrowLeft", "PageUp"].includes(key)) {
      await history.previous(page)
      await updatePlaybackStatus(page)
    } else if (NEXT_KEYS.includes(key)) {
      if (await history.next(page)) {
        await updatePlaybackStatus(page)
      } else {
        await page.evaluate((key) => {
          window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }))
        }, key)
      }
    }
  })
  const listen = () => {
    const controls = window as unknown as {
      __demoControlsInstalled?: boolean
      __demoTogglePlayback: () => Promise<void>
      __demoNavigate: (key: string) => Promise<void>
    }
    if (controls.__demoControlsInstalled) return
    controls.__demoControlsInstalled = true
    window.addEventListener(
      "keydown",
      (event) => {
        const isPrevious = ["ArrowLeft", "PageUp"].includes(event.key)
        const isNext = ["ArrowRight", "PageDown"].includes(event.key)
        if (
          isPrevious ||
          (isNext &&
            (window !== window.top || document.documentElement.dataset.demoReviewing === "true"))
        ) {
          event.preventDefault()
          event.stopImmediatePropagation()
          if (!event.repeat) void controls.__demoNavigate(event.key)
          return
        }
        const target = event.target
        const isEditing =
          target instanceof HTMLElement &&
          Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
        const isShortcut = event.altKey && event.code === "KeyP"
        const isSpace =
          event.code === "Space" && !isEditing && !event.altKey && !event.ctrlKey && !event.metaKey
        if ((!isShortcut && !isSpace) || event.repeat) return
        event.preventDefault()
        event.stopImmediatePropagation()
        void controls.__demoTogglePlayback()
      },
      true,
    )
  }
  await page.addInitScript(listen)
  await Promise.all(page.frames().map((frame) => frame.evaluate(listen)))
}

/** Space kept free at the window edges; the caption sits at the bottom. */
const EDGE_MARGIN = 96
/**
 * Reveals a control with a timed animation, including scrollable dialogs.
 * Native smooth scrolling has browser-controlled speed, so it cannot honor
 * the presentation pace. Measure its destination synchronously, restore the
 * starting positions before painting, then animate the scrolling ancestors.
 */
async function reveal(locator: Locator) {
  const didScroll = await locator
    .first()
    .evaluate(
      (element, { margin, duration }) => {
        const box = element.getBoundingClientRect()
        if (box.top >= margin && box.bottom <= window.innerHeight - margin) return false

        const ancestors = []
        for (let parent = element.parentElement; parent; parent = parent.parentElement) {
          ancestors.push({ element: parent, top: parent.scrollTop, left: parent.scrollLeft })
        }
        element.scrollIntoView({ behavior: "instant", block: "center" })
        const movements = ancestors
          .map((ancestor) => ({
            ...ancestor,
            targetTop: ancestor.element.scrollTop,
            targetLeft: ancestor.element.scrollLeft,
          }))
          .filter(
            (movement) =>
              movement.top !== movement.targetTop || movement.left !== movement.targetLeft,
          )
        for (const movement of movements) {
          movement.element.scrollTo({ top: movement.top, left: movement.left, behavior: "instant" })
        }
        if (movements.length === 0) return false

        return new Promise<boolean>((resolve) => {
          const started = performance.now()
          const animate = (now: number) => {
            const progress = Math.min(1, (now - started) / duration)
            const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2
            for (const movement of movements) {
              movement.element.scrollTo({
                top: movement.top + (movement.targetTop - movement.top) * eased,
                left: movement.left + (movement.targetLeft - movement.left) * eased,
                behavior: "instant",
              })
            }
            if (progress < 1) requestAnimationFrame(animate)
            else resolve(true)
          }
          requestAnimationFrame(animate)
        })
      },
      { margin: EDGE_MARGIN, duration: pacing(locator.page()).scroll },
      { timeout: 2_000 },
    )
    .catch(() => false)
  if (didScroll) await locator.page().waitForTimeout(pacing(locator.page()).afterScroll)
}

/** Slowly tours the whole page; the presenter can pause even during scrolling. */
export async function scrollPage(page: Page) {
  if (!isDemo) return
  await waitForPlayback()
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const root = document.scrollingElement ?? document.documentElement
        const destination = root.scrollHeight - root.clientHeight
        let position = root.scrollTop
        let previous = performance.now()
        const animate = (now: number) => {
          const elapsed = Math.min(now - previous, 100)
          previous = now
          if (document.documentElement.dataset.demoPaused !== "true") {
            // Constant reading pace, independent of the distance to the footer.
            position = Math.min(destination, position + elapsed * 0.16)
            root.scrollTo({ top: position, behavior: "instant" })
          }
          if (position < destination) requestAnimationFrame(animate)
          else resolve()
        }
        requestAnimationFrame(animate)
      }),
  )
  await page.waitForTimeout(DEMO_SCROLL_HOLD)
  await waitForPlayback()
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

/** Page methods that leave the current page. */
const LEAVING_ACTIONS = ["goto", "reload", "goBack"] as const

const lastNavigation = new WeakMap<Page, number>()

const mutations = new WeakMap<Page, { pending: Set<Request>; finishedAt: number }>()

/** Wait for writes to finish, then leave their result visible before continuing. */
async function holdAfterSubmission(page: Page, submittedAt = 0) {
  const state = mutations.get(page)
  const deadline = Date.now() + 15_000
  while (state?.pending.size) {
    if (Date.now() >= deadline) {
      throw new Error("Demo: odeslání formuláře se nedokončilo do 15 sekund.")
    }
    await page.waitForTimeout(100)
  }
  const finishedAt = Math.max(state?.finishedAt ?? 0, submittedAt)
  const remaining = finishedAt + pacing(page).afterSubmit - Date.now()
  if (remaining > 0) await page.waitForTimeout(remaining)
}

/** Recognize native form submission, including Enter and client-side validation. */
async function isFormSubmission(locator: Locator, name: string, args: unknown[]) {
  if (name !== "click" && !(name === "press" && args[0] === "Enter")) return false
  return locator
    .evaluate((element, action) => {
      const control = element.closest("button, input")
      if (action === "press") return Boolean(element.closest("form"))
      return (
        (control instanceof HTMLButtonElement || control instanceof HTMLInputElement) &&
        control.type === "submit" &&
        Boolean(control.form)
      )
    }, name)
    .catch(() => false)
}

/** Notes when `page` last opened another page (also within the app). */
function trackNavigations(page: Page) {
  if (lastNavigation.has(page)) return
  lastNavigation.set(page, 0)
  const state = { pending: new Set<Request>(), finishedAt: 0 }
  mutations.set(page, state)
  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) state.pending.add(request)
  })
  const finished = (request: Request) => {
    if (state.pending.delete(request)) state.finishedAt = Date.now()
  }
  page.on("requestfinished", finished)
  page.on("requestfailed", finished)
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame() || frame.name() === "demo-participant") {
      lastNavigation.set(page, Date.now())
    }
  })
}

/**
 * A page that has just opened stays on screen for DEMO_NAVIGATION_HOLD before
 * the demo acts on it or leaves it, so the audience sees every page it passes.
 */
async function holdAfterNavigation(page: Page) {
  const remaining = (lastNavigation.get(page) ?? 0) + pacing(page).navigation - Date.now()
  if (remaining > 0) await page.waitForTimeout(remaining)
}

let hasRevealingActions = false

// Playwright scrolls before an action too, but it jumps and stops at the
// window edge, under the caption. Locator is not exported as a value, so the
// prototype comes from an instance; demo mode only. Actions and navigations
// also wait until a newly opened page has been seen.
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
      await waitForPlayback()
      await holdAfterSubmission(this.page())
      await holdAfterNavigation(this.page())
      await waitForPlayback()
      await reveal(this)
      await waitForPlayback()
      const submittedAt = (await isFormSubmission(this, name, args)) ? Date.now() : 0
      const result = await action.apply(this, args)
      await holdAfterSubmission(this.page(), submittedAt)
      await waitForPlayback()
      return result
    }
  }
  // The centered mobile app navigates within a frame, but keeps the same
  // navigation holds and pause gates as the desktop page.
  const framePrototype = Object.getPrototypeOf(page.mainFrame()) as Record<
    string,
    (this: Frame, ...args: unknown[]) => Promise<unknown>
  >
  const navigateFrame = framePrototype.goto!
  framePrototype.goto = async function (this: Frame, ...args: unknown[]) {
    await waitForPlayback()
    await holdAfterSubmission(this.page())
    await holdAfterNavigation(this.page())
    await waitForPlayback()
    return navigateFrame.apply(this, args)
  }
  const pagePrototype = Object.getPrototypeOf(page) as Record<
    string,
    (this: Page, ...args: unknown[]) => Promise<unknown>
  >
  for (const name of LEAVING_ACTIONS) {
    const action = pagePrototype[name]!
    pagePrototype[name] = async function (this: Page, ...args: unknown[]) {
      await waitForPlayback()
      await holdAfterSubmission(this)
      await holdAfterNavigation(this)
      await waitForPlayback()
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
        await waitForPlayback()
        await holdAfterSubmission(locator.page())
        await reveal(locator)
        await waitForPlayback()
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
  await installPlaybackControls(page)
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
          // Wraps within the window, also on a 360 px phone page.
          width: "max-content",
          maxWidth: "calc(100vw - 32px)",
          textAlign: "center",
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
      caption.dataset.title = text
      caption.textContent = text
    },
    { id: CAPTION_ID, text },
  )
  await updatePlaybackStatus(page)
}

/** Keys that continue a paused demo: arrow right, and what slide clickers send. */
const NEXT_KEYS = ["ArrowRight", "PageDown"]

/**
 * Waits in the page, not in the Playwright Inspector: no extra window per
 * browser and nothing highlighted. The page must be in front, so the key
 * reaches it.
 */
async function waitForPresenter(page: Page, label = "Spustit →") {
  presenterPages.add(page)
  try {
    await page.evaluate(
      ({ id, keys, label }) =>
        new Promise<void>((resolve) => {
          const next = document.createElement("button")
          next.type = "button"
          next.textContent = label
          Object.assign(next.style, {
            marginLeft: "12px",
            padding: "2px 12px",
            border: "1px solid rgba(249, 250, 251, 0.5)",
            borderRadius: "999px",
            background: "transparent",
            color: "inherit",
            font: "inherit",
            cursor: "pointer",
            pointerEvents: "auto",
          })
          document.getElementById(id)?.appendChild(next)

          const onKey = (event: KeyboardEvent) => {
            if (
              !keys.includes(event.key) ||
              event.repeat ||
              document.documentElement.dataset.demoReviewing === "true" ||
              document.getElementById(id)?.textContent?.startsWith("⏸")
            ) {
              return
            }
            // The key only drives the demo, never the page under it.
            event.preventDefault()
            event.stopPropagation()
            finish()
          }
          const finish = () => {
            window.removeEventListener("keydown", onKey, true)
            next.remove()
            resolve()
          }
          window.addEventListener("keydown", onKey, true)
          next.addEventListener("click", () => {
            if (
              document.documentElement.dataset.demoReviewing !== "true" &&
              !document.getElementById(id)?.textContent?.startsWith("⏸")
            ) {
              finish()
            }
          })
        }),
      { id: CAPTION_ID, keys: NEXT_KEYS, label },
    )
  } finally {
    presenterPages.delete(page)
  }
}

/** The page whose window the audience sees. */
let frontPage: Page | undefined
const arrangedPages = new WeakSet<Page>()

/** The browser window that shows `page`, with its screen bounds. */
async function windowOf(page: Page) {
  const session = await page.context().newCDPSession(page)
  const { windowId, bounds } = await session.send("Browser.getWindowForTarget")
  return { session, windowId, bounds }
}

/**
 * Fits a window for the audience the first time it is shown: a desktop one
 * (its page follows the window size) is maximized, a phone-sized one moves
 * to the middle of the window in front. Playwright sizes a phone window but
 * leaves it in the corner. Cosmetic: if the window manager refuses, the
 * window stays as it is.
 */
async function arrangeWindow(page: Page) {
  if (isRecording || arrangedPages.has(page)) return
  arrangedPages.add(page)
  const target = await windowOf(page)
  try {
    if (page.viewportSize() === null) {
      await target.session.send("Browser.setWindowBounds", {
        windowId: target.windowId,
        bounds: { windowState: "maximized" },
      })
    } else if (frontPage && !frontPage.isClosed()) {
      const main = await windowOf(frontPage)
      await main.session.detach()
      const { width = 0, height = 0 } = target.bounds
      const { left = 0, top = 0, width: mainWidth = 0, height: mainHeight = 0 } = main.bounds
      await target.session.send("Browser.setWindowBounds", {
        windowId: target.windowId,
        bounds: {
          left: left + Math.max(0, Math.round((mainWidth - width) / 2)),
          top: top + Math.max(0, Math.round((mainHeight - height) / 2)),
        },
      })
    }
  } catch {
    // The window keeps its size and place.
  } finally {
    await target.session.detach()
  }
}

/** Brings the window of `page` to the front, fitted the first time. */
async function present(page: Page) {
  if (frontPage === page) return
  await page.bringToFront()
  await arrangeWindow(page)
  frontPage = page
}

/**
 * A named step of the scenario. In demo mode it captions the window in front
 * and waits for the presenter there; only then does it switch to the step's
 * own window, if that is another one, and act.
 */
export async function step<T>(page: Page, title: string, body: () => Promise<T>): Promise<T> {
  return test.step(title, async () => {
    if (isDemo) {
      revealBeforeActions(page)
      trackNavigations(page)
      const stage = shouldPause && frontPage && !frontPage.isClosed() ? frontPage : page
      await present(stage)
      await showCaption(stage, title)
      if (shouldPause) await waitForPresenter(stage)
      if (stage !== page) {
        await present(page)
        await showCaption(page, title)
      }
    }
    if (isDemo) await waitForPlayback()
    const result = await body()
    if (shouldPause && !isRecording) await history.record(page, title)
    return result
  })
}

/**
 * The demo's last stop: a step waits before it acts, so without this the
 * browser would close as soon as the last step's result appears.
 */
export async function endDemo(page: Page) {
  if (!shouldPause) return
  const stage = frontPage && !frontPage.isClosed() ? frontPage : page
  await showCaption(stage, "Konec ukázky")
  await waitForPresenter(stage, "Ukončit")
}

/** Types visibly; quick entry removes the browser's extra delay between fields. */
export async function type(
  field: Locator,
  text: string,
  {
    shouldClear = true,
    pace = "normal",
  }: { shouldClear?: boolean; pace?: "normal" | "quick" } = {},
) {
  if (!isDemo) {
    await field.fill(text)
    return
  }
  if (pace === "normal" && !quickDemoPages.has(field.page())) {
    if (shouldClear) await field.clear()
    await field.pressSequentially(text, { delay: DEMO_TYPING_DELAY })
    return
  }

  const page = field.page()
  await waitForPlayback()
  await holdAfterSubmission(page)
  await holdAfterNavigation(page)
  await reveal(field)
  await waitForPlayback()
  if (shouldClear) await field.clear()
  await field.evaluate((element) => (element as HTMLElement).focus())
  const session = await page.context().newCDPSession(page)
  try {
    for (const character of text) {
      await waitForPlayback()
      // Public Chromium input events retain visible input and React updates,
      // without the launch-level slowMo pause after each completed field.
      await session.send("Input.insertText", { text: character })
      await page.waitForTimeout(pacing(page).typing)
    }
    await page.waitForTimeout(200)
  } finally {
    await session.detach()
  }
}
