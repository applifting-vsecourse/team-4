import type { StorybookConfig } from "@storybook/react-vite"

// Storybook reuses vite.config.ts. The router plugin would regenerate
// src/routeTree.gen.ts and the checker would lint inside Storybook, so both
// are dropped here; stories never render the app's route tree.
const EXCLUDED_PLUGIN_PREFIXES = ["tanstack-router", "vite-plugin-checker"]

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  addons: ["@storybook/addon-vitest", "@storybook/addon-a11y"],
  stories: ["../src/**/*.stories.tsx"],
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    plugins: (viteConfig.plugins ?? []).flat().filter((plugin) => {
      const name = plugin && "name" in plugin ? plugin.name : ""
      return !EXCLUDED_PLUGIN_PREFIXES.some((prefix) => name.startsWith(prefix))
    }),
  }),
}

export default config
