import "@testing-library/jest-dom/vitest"

import { vi } from "vitest"

// jsdom has no ResizeObserver; Radix controls with a size (Checkbox) need one.
globalThis.ResizeObserver ??= class ResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
