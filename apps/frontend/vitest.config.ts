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
        },
      },
      {
        // Every story in src/**/*.stories.tsx renders in Chromium and runs its
        // `play` function and the a11y checks.
        extends: true,
        // Vitest does not read vite.config.ts, so the styling and asset
        // plugins previews need are listed here.
        plugins: [tailwindcss(), svgr(), storybookTest({ configDir: ".storybook" })],
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
