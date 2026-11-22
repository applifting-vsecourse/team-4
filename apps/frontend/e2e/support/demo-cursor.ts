import type { Locator, Page } from "@playwright/test"

const CURSOR_ID = "e2e-demo-cursor"

/** A projection-friendly cursor that stays visible in screenshots and video. */
export async function installDemoCursor(page: Page) {
  await page.evaluate((id) => {
    if (document.getElementById(id)) return
    const style = document.createElement("style")
    style.id = "e2e-demo-cursor-style"
    style.textContent = "*, *::before, *::after { cursor: none !important; }"
    document.head.append(style)
    const cursor = document.createElement("div")
    cursor.id = id
    cursor.setAttribute("aria-hidden", "true")
    cursor.innerHTML =
      '<svg viewBox="0 0 28 36" focusable="false"><path d="M3 2v27l7-7 5 11 5-2-5-11h10L3 2Z"/></svg>'
    Object.assign(cursor.style, {
      position: "fixed",
      zIndex: "2147483647",
      left: "0",
      top: "0",
      width: "28px",
      height: "36px",
      pointerEvents: "none",
      transform: "translate(-2px,-2px)",
      filter: "drop-shadow(0 1px 2px #000)",
      opacity: "0",
      willChange: "left, top",
    })
    const svg = cursor.querySelector("svg")!
    Object.assign(svg.style, { display: "block", width: "100%", height: "100%" })
    const path = cursor.querySelector("path")!
    path.setAttribute("fill", "#f8e36a")
    path.setAttribute("stroke", "#252525")
    path.setAttribute("stroke-width", "2.2")
    document.body.append(cursor)
  }, CURSOR_ID)
}

/** Animate the demo layer and the automation pointer along the same path. */
export async function moveDemoCursorTo(page: Page, x: number, y: number, steps = 20) {
  await Promise.all([
    page.mouse.move(x, y, { steps }),
    page.evaluate(
      ({ id, x, y, duration }) => {
        const cursor = document.getElementById(id)
        if (!cursor) return

        const parsedX = Number.parseFloat(cursor.style.left)
        const parsedY = Number.parseFloat(cursor.style.top)
        const startX = Number.isFinite(parsedX) ? parsedX : x
        const startY = Number.isFinite(parsedY) ? parsedY : y
        cursor.style.opacity = "1"
        return new Promise<void>((resolve) => {
          const started = performance.now()
          const animate = (now: number) => {
            const progress = Math.min(1, (now - started) / duration)
            const eased = 1 - (1 - progress) ** 3
            cursor.style.left = `${startX + (x - startX) * eased}px`
            cursor.style.top = `${startY + (y - startY) * eased}px`
            if (progress < 1) requestAnimationFrame(animate)
            else resolve()
          }
          requestAnimationFrame(animate)
        })
      },
      { id: CURSOR_ID, x, y, steps, duration: Math.max(350, steps * 20) },
    ),
  ])
}

/** Move to a control before clicking, with the cursor isolated from user input. */
export async function moveDemoCursor(locator: Locator, shouldPulse = false) {
  const box = await locator.boundingBox()
  if (!box) return
  const page = locator.page()
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await moveDemoCursorTo(page, x, y)
  if (shouldPulse) {
    await page.evaluate(
      ({ x, y }) => {
        const ring = document.createElement("span")
        Object.assign(ring.style, {
          position: "fixed",
          left: `${x}px`,
          top: `${y}px`,
          width: "24px",
          height: "24px",
          border: "2px solid #f8e36a",
          borderRadius: "50%",
          transform: "translate(-50%,-50%) scale(.7)",
          opacity: ".9",
          pointerEvents: "none",
          zIndex: "2147483646",
          transition: "transform 350ms ease, opacity 350ms ease",
        })
        document.body.append(ring)
        requestAnimationFrame(() => {
          ring.style.transform = "translate(-50%,-50%) scale(1.35)"
          ring.style.opacity = "0"
        })
        window.setTimeout(() => ring.remove(), 400)
      },
      { x, y },
    )
  }
  await page.waitForTimeout(350)
}
