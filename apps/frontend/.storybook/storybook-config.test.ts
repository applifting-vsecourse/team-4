import { describe, expect, it } from "vitest"

import { isApiRequest, withoutAppOnlyPlugins } from "./storybook-config"

describe("withoutAppOnlyPlugins", () => {
  it("drops every TanStack router plugin and the checker, keeps the rest", () => {
    const names = [
      "tanstack:router-generator",
      "tanstack:router-inline-css-defaults",
      "tanstack-router:code-splitter:compile-reference-file",
      "vite-plugin-checker",
      "vite:react-babel",
      "@tailwindcss/vite:scan",
      "vite-plugin-svgr",
    ]
    const kept = withoutAppOnlyPlugins([names.map((name) => ({ name })), null, false])
    expect(kept.map((plugin) => plugin.name)).toEqual([
      "vite:react-babel",
      "@tailwindcss/vite:scan",
      "vite-plugin-svgr",
    ])
  })
})

describe("isApiRequest", () => {
  const api = "http://localhost:3000/api"

  it("matches requests to the API", () => {
    expect(isApiRequest(`${api}/organizations`, api)).toBe(true)
  })

  it("ignores Storybook and Vite assets on another origin or path", () => {
    expect(isApiRequest("http://localhost:6006/src/components/BrandMark.tsx", api)).toBe(false)
    expect(isApiRequest("http://localhost:3000/apis-docs", api)).toBe(false)
  })
})
