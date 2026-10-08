import js from "@eslint/js"
import eslintConfigPrettier from "eslint-config-prettier"
import globals from "globals"
import tseslint from "typescript-eslint"

export default tseslint.config(
  { ignores: ["dist/**", "coverage/**", "node_modules/**", "prisma/**", "src/generated/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/explicit-function-return-type": "warn",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
  {
    // DTOs are presentation-layer types. Only files that own the HTTP boundary
    // (controllers and the DTOs themselves) may reference them. Anywhere else
    // should depend on domain types instead.
    files: ["src/**/*.ts"],
    ignores: ["src/**/*.controller.ts", "src/**/controllers/**", "src/**/dto/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^\\.\\./",
              message:
                "Use the `@/` alias instead of climbing out of the folder with `../`. Relative imports are fine for siblings (`./`).",
            },
            {
              group: ["**/dto/**", "**/*.dto"],
              message:
                "DTOs are presentation-layer types and must only be imported by controllers (or other DTOs). Depend on the domain type instead.",
            },
          ],
        },
      ],
    },
  },
  {
    // Controllers and DTOs are exempt from the rule above, so the relative-import
    // ban is restated for them: a later config replaces the rule, never merges.
    files: ["src/**/*.controller.ts", "src/**/controllers/**", "src/**/dto/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^\\.\\./",
              message:
                "Use the `@/` alias instead of climbing out of the folder with `../`. Relative imports are fine for siblings (`./`).",
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
)
