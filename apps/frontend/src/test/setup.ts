import "@testing-library/jest-dom/vitest"

import { afterEach, vi } from "vitest"

// jsdom has no ResizeObserver; Radix controls with a size (Checkbox) need one.
globalThis.ResizeObserver ??= class ResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

// Drafts kept for the browser tab must not leak from one test into the next.
afterEach(() => {
  window.sessionStorage.clear()
})
