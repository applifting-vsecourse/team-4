import { storybookTest } from "@storybook/addon-vitest/vitest-plugin"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { playwright } from "@vitest/browser-playwright"
import svgr from "vite-plugin-svgr"
import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  // Vite 8 resolves tsconfig `paths` (the `@/` alias) natively.
  resolve: { tsconfigPaths: true },
  test: {
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
          globals: true,
          exclude: [...configDefaults.exclude, "e2e/**"],
          // jsdom interaction tests pass in well under a second, but on a busy
          // machine the 5 s default produces false failures.
          testTimeout: 15_000,
        },
      },
      {
        // Every story in src/**/*.stories.tsx renders in Chromium and runs its
        // `play` function and the a11y checks.
        extends: true,
        // Vitest does not read vite.config.ts, so the styling and asset
        // plugins previews need are listed here.
        plugins: [tailwindcss(), svgr(), storybookTest({ configDir: ".storybook" })],
        // Page previews import the whole app. Scanning the stories up front
        // finds its dependencies before the first test; found mid-run, Vite
        // re-optimizes and reloads the browser, which fails the running file.
        optimizeDeps: { entries: [".storybook/preview.tsx", "src/**/*.stories.tsx"] },
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
})
