import fs from "node:fs"
import path from "node:path"

import { fixupConfigRules } from "@eslint/compat"
import js from "@eslint/js"
import shadcn from "@shadcn/lint"
import pluginQuery from "@tanstack/eslint-plugin-query"
import pluginRouter from "@tanstack/eslint-plugin-router"
import importPlugin from "eslint-plugin-import"
import jsxA11y from "eslint-plugin-jsx-a11y"
import pluginReact from "eslint-plugin-react"
import pluginReactHooks from "eslint-plugin-react-hooks"
import globals from "globals"
import tseslint from "typescript-eslint"

const FEATURES_DIR = "./src/features"

// Bulletproof React: each feature can only import from itself.
const featureZones = (() => {
  if (!fs.existsSync(FEATURES_DIR)) return []
  return fs
    .readdirSync(FEATURES_DIR)
    .filter((entry) => fs.statSync(path.join(FEATURES_DIR, entry)).isDirectory())
    .map((feature) => ({
      target: `${FEATURES_DIR}/${feature}`,
      from: FEATURES_DIR,
      except: [`./${feature}`],
    }))
})()

const typescriptRules = {
  "@typescript-eslint/consistent-type-definitions": ["error", "type"],
  "@typescript-eslint/no-misused-promises": [
    2,
    { checksVoidReturn: { attributes: false } },
  ],
  "@typescript-eslint/consistent-type-imports": [
    "warn",
    { fixStyle: "inline-type-imports" },
  ],
  "@typescript-eslint/no-unused-vars": [
    "error",
    {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_",
    },
  ],
  "@typescript-eslint/naming-convention": [
    "error",
    {
      selector: "variable",
      types: ["boolean"],
      format: ["PascalCase"],
      prefix: ["is", "should", "has", "can", "did", "will", "does"],
    },
    {
      selector: "parameter",
      types: ["boolean"],
      format: ["PascalCase"],
      prefix: ["is", "should", "has", "can", "did", "will", "does"],
      filter: { regex: "^(asChild|prev|required|rememberMe)$", match: false },
    },
  ],
  "@typescript-eslint/only-throw-error": "off",
}

const commonRules = {
  "no-console": ["warn", { allow: ["warn", "error"] }],
  "no-restricted-syntax": [
    "error",
    {
      selector:
        "UnaryExpression[operator='!'][argument.type='UnaryExpression'][argument.operator='!']",
      message: "Don't use double negation (!!). Use Boolean() instead.",
    },
  ],
  curly: ["error", "multi-line"],
  "no-restricted-imports": [
    "error",
    {
      paths: [
        {
          name: "react",
          importNames: ["default"],
          message:
            "Default React import is not necessary for JSX to work. Use named imports (e.g. `import { useEffect } from 'react'`).",
        },
      ],
      patterns: [
        {
          group: ["..*"],
          message:
            "Avoid using relative imports except sibling files. Use absolute imports instead.",
        },
      ],
    },
  ],
}

const importRules = {
  "import/no-unresolved": "error",
  "import/no-cycle": "error",
  "import/no-restricted-paths": [
    "error",
    {
      zones: [
        ...featureZones,
        {
          target: FEATURES_DIR,
          from: ["./src/app", "./src/routes"],
          except: ["./routes.ts"],
        },
        {
          target: [
            "./src/components",
            "./src/config",
            "./src/hooks",
            "./src/lib",
          ],
          from: ["./src/features", "./src/app"],
          except: ["./routes.ts"],
        },
      ],
    },
  ],
}

const UI_DIR = "src/components/ui/**"

const shadcnRules = {
  "shadcn/no-restyle": ["error", { allow: ["layout"] }],
  "shadcn/no-raw-colors": "error",
  "shadcn/no-arbitrary-values": "error",
  "shadcn/no-inline-styles": "error",
  "shadcn/no-unknown-classes": "error",
}

// Files that predate @shadcn/lint get warnings instead of errors. Remove an
// entry once its file is fixed; never add new ones.
const SHADCN_LEGACY_FILES = [
  "src/components/BrandMark.tsx",
  "src/components/Header/HeaderLogo.tsx",
  "src/components/RecordUnavailable.tsx",
  "src/components/ui/alert.tsx",
  "src/components/ui/badge.tsx",
  "src/components/ui/button.tsx",
  "src/components/ui/calendar.tsx",
  "src/components/ui/card.tsx",
  "src/components/ui/checkbox.tsx",
  "src/components/ui/command.tsx",
  "src/components/ui/dialog.tsx",
  "src/components/ui/dropdown-menu.tsx",
  "src/components/ui/input.tsx",
  "src/components/ui/progress.tsx",
  "src/components/ui/radio-group.tsx",
  "src/components/ui/select.tsx",
  "src/components/ui/sidebar.tsx",
  "src/components/ui/sonner.tsx",
  "src/components/ui/switch.tsx",
  "src/components/ui/table.tsx",
  "src/components/ui/tabs.tsx",
  "src/components/ui/textarea.tsx",
  "src/components/ui/tooltip.tsx",
  "src/features/auth/components/HeaderMenu.tsx",
  "src/features/auth/components/SidebarAccount.tsx",
  "src/features/design-system/components/ControlsSection.tsx",
  "src/features/design-system/components/DataDisplaySection.tsx",
  "src/features/design-system/components/FoundationsSection.tsx",
  "src/features/design-system/components/OverlaysNavigationSection.tsx",
  "src/features/events/components/EventNavigation.tsx",
  "src/features/events/components/EventsEmptyState.tsx",
  "src/features/events/components/EventsTable.tsx",
  "src/features/events/components/PaymentSettingsForm.tsx",
  "src/features/events/components/PaymentSettingsSection.tsx",
  "src/features/events/components/RegistrationSection.tsx",
  "src/features/events/components/TermsSection.tsx",
  "src/features/landing/components/AppPreview.tsx",
  "src/features/landing/components/EntryCard.tsx",
  "src/features/landing/components/LandingPage.tsx",
  "src/features/organizations/components/OrganizationSidebar.tsx",
  "src/features/public-events/components/PublicEventView.tsx",
  "src/features/rooms/components/RoomsSection.tsx",
  "src/routes/_ProtectedPages/organizations/$organizationId.tsx",
  "src/routes/_ProtectedPages/organizations/$organizationId/events/$eventId/settings.tsx",
]

// Vendored shadcn/ui primitives follow upstream conventions (default React
// import, interface for props) that diverge from the project's lint rules,
// so only the shadcn token rules run there.
const projectConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ...fixupConfigRules(pluginReact.configs.flat.recommended),
  ...fixupConfigRules(jsxA11y.flatConfigs.recommended),
  ...pluginQuery.configs["flat/recommended"],
  ...pluginRouter.configs["flat/recommended"],
  ...fixupConfigRules(importPlugin.flatConfigs.recommended),
  {
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      ...jsxA11y.flatConfigs.recommended.languageOptions,
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: { "react-hooks": pluginReactHooks },
    settings: {
      react: { version: "detect" },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: ["./tsconfig.json"],
        },
      },
    },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      ...typescriptRules,
      ...commonRules,
      ...importRules,
    },
  },
]

export default [
  {
    ignores: ["build/**", "dist/**", "src/routeTree.gen.ts"],
  },
  ...projectConfig.map((config) => ({
    ...config,
    ignores: [...(config.ignores ?? []), UI_DIR],
  })),
  {
    files: ["src/**/*.tsx"],
    plugins: { shadcn },
    settings: { shadcn: { note: "See AGENTS.md, UI rules." } },
    rules: shadcnRules,
  },
  {
    files: SHADCN_LEGACY_FILES,
    rules: Object.fromEntries(
      Object.entries(shadcnRules).map(([rule, value]) => [
        rule,
        Array.isArray(value) ? ["warn", ...value.slice(1)] : "warn",
      ]),
    ),
  },
  {
    // Components own their styling; token rules still apply.
    files: [UI_DIR],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: { "shadcn/no-restyle": "off" },
  },
]
