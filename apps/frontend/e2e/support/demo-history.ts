import { type Page } from "@playwright/test"

const REVIEW_ID = "e2e-demo-review"
const CAPTION_ID = "e2e-demo-caption"

/** Read-only views of completed steps. Stored in memory for this run only. */
export class DemoHistory {
  private snapshots: { title: string; image: string }[] = []
  private cursor: number | null = null

  get isReviewing() {
    return this.cursor !== null
  }

  get reviewTitle() {
    if (this.cursor === null) return null
    return `Náhled ${this.cursor + 1}/${this.snapshots.length} · ${this.snapshots[this.cursor]!.title} · ← zpět / → vpřed`
  }

  clear() {
    this.snapshots = []
    this.cursor = null
  }

  async record(page: Page, title: string) {
    const screenshot = await page.screenshot({
      type: "jpeg",
      quality: 80,
      style: `#${CAPTION_ID} { visibility: hidden !important; }`,
      timeout: 5000,
    })
    this.snapshots.push({ title, image: `data:image/jpeg;base64,${screenshot.toString("base64")}` })
  }

  async previous(page: Page) {
    if (this.snapshots.length === 0) return
    this.cursor = this.cursor === null ? this.snapshots.length - 1 : Math.max(0, this.cursor - 1)
    await this.render(page)
  }

  /** True means the key reviewed history and must not start a live action. */
  async next(page: Page) {
    if (this.cursor === null) return false
    if (this.cursor < this.snapshots.length - 1) {
      this.cursor += 1
      await this.render(page)
    } else {
      this.cursor = null
      await page.evaluate(
        ({ reviewId, captionId }) => {
          document.getElementById(reviewId)?.remove()
          delete document.documentElement.dataset.demoReviewing
          const next = document.getElementById(captionId)?.querySelector("button")
          if (next) next.disabled = false
        },
        { reviewId: REVIEW_ID, captionId: CAPTION_ID },
      )
    }
    return true
  }

  private async render(page: Page) {
    const snapshot = this.snapshots[this.cursor!]!
    await page.evaluate(
      ({ reviewId, captionId, snapshot }) => {
        let overlay = document.getElementById(reviewId)
        if (!overlay) {
          overlay = document.createElement("div")
          overlay.id = reviewId
          overlay.tabIndex = -1
          Object.assign(overlay.style, {
            boxSizing: "border-box",
            position: "fixed",
            inset: "0",
            zIndex: "2147483646",
            background: "#303030",
            display: "grid",
            placeItems: "center",
            paddingBottom: "96px",
          })
          document.body.appendChild(overlay)
        }
        const image = document.createElement("img")
        image.alt = `Náhled dokončeného kroku: ${snapshot.title}`
        image.src = snapshot.image
        Object.assign(image.style, {
          width: "100%",
          height: "100%",
          minHeight: "0",
          objectFit: "contain",
        })
        overlay.replaceChildren(image)
        document.documentElement.dataset.demoReviewing = "true"
        const next = document.getElementById(captionId)?.querySelector("button")
        if (next) next.disabled = true
        overlay.focus()
      },
      { reviewId: REVIEW_ID, captionId: CAPTION_ID, snapshot },
    )
  }
}
