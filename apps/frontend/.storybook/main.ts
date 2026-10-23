import type { StorybookConfig } from "@storybook/react-vite"

import { withoutAppOnlyPlugins } from "./storybook-config"

// Storybook reuses vite.config.ts minus the app-only plugins.

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  addons: [
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "msw-storybook-addon",
    // MCP server for agents at http://localhost:6006/mcp (see .mcp.json).
    "@storybook/addon-mcp",
  ],
  // Serves mockServiceWorker.js for MSW. Kept out of public/ so it never
  // ships in the production build.
  staticDirs: ["./public"],
  stories: ["../src/**/*.stories.tsx"],
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    plugins: withoutAppOnlyPlugins(viteConfig.plugins ?? []),
  }),
}

export default config
