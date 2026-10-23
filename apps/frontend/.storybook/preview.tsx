import type { Preview } from "@storybook/react-vite"

import "@/styles/global.css"

import { withQueryClient, withRouter, withTheme } from "./decorators"

const preview: Preview = {
  // The first decorator is the innermost: theme → query client → router.
  decorators: [withTheme, withQueryClient, withRouter],
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
    viewport: {
      options: {
        mobile360: { name: "Mobile 360", styles: { width: "360px", height: "740px" } },
        desktop: { name: "Desktop", styles: { width: "1280px", height: "800px" } },
      },
    },
  },
}

export default preview
