// Runs from the repo root so both apps are covered — a backend file that
// skipped formatting used to pass the hook and then fail CI.
export default {
  'apps/frontend/src/**/*.{ts,tsx,css}': ['prettier --write'],
  'apps/frontend/src/**/*.{ts,tsx,js,cjs,mjs}': [
    'pnpm --filter frontend exec eslint --fix',
  ],
  'apps/backend/src/**/*.ts': [
    'prettier --write',
    'pnpm --filter backend exec eslint --fix',
  ],
  '*.{json,md,yaml,yml}': ['prettier --write'],
};
