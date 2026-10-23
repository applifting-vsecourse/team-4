import { test, type Locator, type Page } from "@playwright/test"

// One scenario, two audiences. As a test it runs headless and fast. With
// DEMO=1 it becomes a guided walkthrough: every `step` shows a caption in the
// page and then pauses in the Playwright Inspector until the presenter
// presses Resume, and `type` types visibly instead of pasting. DEMO_PAUSE=0
// plays it through without pauses.

export const isDemo = process.env.DEMO === "1"
/** DEMO_PAUSE=0 plays the walkthrough through without stopping (autoplay). */
const shouldPause = isDemo && process.env.DEMO_PAUSE !== "0"

const CAPTION_ID = "e2e-demo-caption"

async function showCaption(page: Page, text: string) {
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
    if (isDemo) await showCaption(page, title)
    const result = await body()
    if (shouldPause && pause) await page.pause()
    return result
  })
}

/** Fills a field; in demo mode types it key by key so the audience sees it. */
export async function type(field: Locator, text: string) {
  if (isDemo) {
    await field.clear()
    await field.pressSequentially(text, { delay: 35 })
  } else {
    await field.fill(text)
  }
}
