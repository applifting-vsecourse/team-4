import type { Preview } from "@storybook/react-vite"
import { mswLoader } from "msw-storybook-addon/csf3"

import "@/styles/global.css"

import { withQueryClient, withRouter, withTheme } from "./decorators"

const preview: Preview = {
  // The first decorator is the innermost: theme → query client → router.
  decorators: [withTheme, withQueryClient, withRouter],
  // Starts the MSW worker; stories add handlers with `msw.use()` in `beforeEach`.
  loaders: [mswLoader()],
  globalTypes: {
    theme: {
      description: "Colour theme",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  parameters: {
    // Accessibility violations fail the story test.
    a11y: { test: "error" },
    viewport: {
      options: {
        mobile360: { name: "Mobile 360", styles: { width: "360px", height: "740px" } },
        desktop: { name: "Desktop", styles: { width: "1280px", height: "800px" } },
      },
    },
  },
}

export default preview
