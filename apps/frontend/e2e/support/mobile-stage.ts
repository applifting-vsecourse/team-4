import { type BrowserContext, type Frame, type Page } from "@playwright/test"

import { isDemo } from "./demo"
import { isRecording } from "./recording"

export const MOBILE_VIEWPORT = { width: 360, height: 800 }

/** A full-window presentation surface containing the real narrow app viewport. */
export async function createMobileStage(
  context: BrowserContext,
  baseURL: string,
): Promise<{ window: Page; content: Page | Frame }> {
  const window = await context.newPage()
  if (!isDemo || isRecording) return { window, content: window }

  const stageURL = new URL("/__demo/mobile-stage", baseURL).href
  await window.route(stageURL, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html>
      <html lang="cs"><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Účastník • akc.io — mobilní demo</title>
      <style>
        html { color-scheme: light dark; background: #303030; }
        body { margin: 0; min-height: 100dvh; display: grid; place-items: center; overflow: hidden; }
        iframe { display: block; border: 0; width: ${MOBILE_VIEWPORT.width}px;
          height: min(${MOBILE_VIEWPORT.height}px, calc(100dvh - 128px)); background: Canvas; }
      </style></head><body>
      <iframe name="demo-participant" title="Mobilní ukázka účastníka"></iframe>
      </body></html>`,
    }),
  )
  await window.goto(stageURL)
  const content = window.frame({ name: "demo-participant" })
  if (!content) throw new Error("Mobilní náhled dema se nepodařilo vytvořit.")

  // Keep the real participant URL visible in the browser address bar while
  // the app itself stays inside the centered mobile viewport. SPA navigation
  // emits framenavigated too, including history.pushState/replaceState.
  const origin = new URL(baseURL).origin
  let addressUpdate = Promise.resolve()
  window.on("framenavigated", (frame) => {
    if (frame !== content) return
    const url = frame.url()
    if (!url.startsWith(`${origin}/`)) return
    addressUpdate = addressUpdate
      .then(async () => {
        if (window.isClosed()) return
        await window.evaluate((url) => globalThis.history.replaceState(null, "", url), url)
      })
      .catch(() => {
        // Closing the window can interrupt its last address update.
      })
  })

  return { window, content }
}

/** Keep sign-in inside the centered frame instead of navigating its host window. */
export async function openMobileSignInLink(stage: Page, content: Page | Frame, baseURL: string) {
  if (content === stage) return
  // Registering the listener lets the presenter answer this browser-native
  // prompt rather than Playwright dismissing it automatically.
  stage.once("dialog", () => undefined)
  const pasted = await stage.evaluate(() =>
    window.prompt("Vložte přihlašovací odkaz z nejnovějšího e-mailu akc.io a potvrďte OK."),
  )
  if (!pasted) throw new Error("Vložení přihlašovacího odkazu bylo zrušeno.")
  let url: URL
  try {
    url = new URL(pasted.trim())
  } catch {
    throw new Error("Vložte úplnou adresu přihlašovacího odkazu z e-mailu.")
  }
  if (
    url.origin !== new URL(baseURL).origin ||
    url.pathname !== "/my-registrations/verify" ||
    !url.searchParams.get("token")
  ) {
    throw new Error("Odkaz nevede na účastnické přihlášení do této aplikace.")
  }
  await content.goto(url.href)
}
