// Demo pacing, shared by playwright.config.ts and the demo helpers. Kept free
// of Playwright imports so the config can load it.

/** Delay after every browser action in demo mode, in ms (DEMO_SLOWMO). */
export const DEMO_SLOWMO = Number(process.env.DEMO_SLOWMO ?? 1000)

/** Delay between typed keys; follows DEMO_SLOWMO so one knob sets the pace. */
export const DEMO_TYPING_DELAY = Math.round(DEMO_SLOWMO / 40)

/** How long a newly opened page stays on screen before the demo acts on it or leaves it. */
export const DEMO_NAVIGATION_HOLD = DEMO_SLOWMO * 4

/** Duration of a presentation scroll, in ms. */
export const DEMO_SCROLL_DURATION = 1800

/** Time to read a control after scrolling to it, before acting. */
export const DEMO_SCROLL_HOLD = 2000

/** Time to read a saved form result before the next action. */
export const DEMO_SUBMIT_HOLD = 3000
