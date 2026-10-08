/** @type {import('prettier').Config} */
const config = {
  printWidth: 100,
  semi: false,
  trailingComma: "all",
  singleAttributePerLine: true,
  endOfLine: "lf",
  plugins: [
    "@ianvs/prettier-plugin-sort-imports",
    "prettier-plugin-sort-json",
    "prettier-plugin-tailwindcss",
  ],
  importOrder: [
    "^(react/(.*)$)|^(react$)",
    "<THIRD_PARTY_MODULES>",
    "",
    "^@/(?!features/)(.*)$",
    "",
    "^@/features/(.*)$",
    "",
    "^[./]",
  ],
  jsonRecursiveSort: true,
  tailwindFunctions: ["cva", "cn"],
  tailwindStylesheet: "./src/styles/global.css",
  overrides: [
    {
      files: "*.svg",
      options: { parser: "html" },
    },
    {
      files: "tsconfig*.json",
      options: { jsonRecursiveSort: false },
    },
  ],
}

export default config
