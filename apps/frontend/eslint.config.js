import fs from "node:fs"
import path from "node:path"

import { fixupConfigRules } from "@eslint/compat"
import js from "@eslint/js"
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

export default [
  {
    ignores: [
      "build/**",
      "dist/**",
      "src/routeTree.gen.ts",
            // Vendored shadcn/ui primitives follow upstream conventions
      // (default React import, interface for props) that diverge from
      // the project's lint rules.
      "src/components/ui/**",
    ],
  },
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
