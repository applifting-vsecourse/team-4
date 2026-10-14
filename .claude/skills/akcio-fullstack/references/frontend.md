# Frontend conventions (`apps/frontend`)

Stack: React 19, Vite 8, TypeScript (strict, `noUncheckedIndexedAccess`), TanStack Router (file-based) and Query, Tailwind 4 (CSS-first, no `tailwind.config`), shadcn/ui (`new-york`, neutral, Lucide icons), react-hook-form + zod 4, `ky` 2, Vitest + Testing Library, `next-themes`, `sonner`.

Dev server port 3050, API `http://localhost:4050/api` (`VITE_API_URL`), BetterAuth base `VITE_BETTER_AUTH_URL`.

## Folder layout and layering (enforced by ESLint)

```
src/
  app/          router.tsx, Providers.tsx, routes.ts (ROUTES constant)
  routes/       TanStack file routes (thin: loader + layout + composition)
  features/<f>/ api/  hooks/  components/  lib/   (one folder per feature)
  components/   shared app components; ui/ = vendored shadcn kit
  hooks/ lib/ config/   shared infrastructure
  styles/global.css     tokens
```

Rules that fail `pnpm frontend lint:check`:

- A feature may import only from itself. No `features/a` -> `features/b`. Shared code moves to `components/`, `lib/` or `hooks/`.
- `components/`, `config/`, `hooks/`, `lib/` may not import from `features/` or `app/` (the exception is `app/routes.ts`).
- `features/` may not import from `app/` or `routes/` (the exception is `app/routes.ts`).
- No import cycles. No unresolved imports.
- No relative imports except siblings (`./x`). Use `@/...`.
- No default React import; use named imports (`import { useState } from "react"`).
- `type` aliases, not `interface` (`consistent-type-definitions`). Inline type imports (`import { type X }`).
- Boolean variables and parameters must be prefixed `is`, `should`, `has`, `can`, `did`, `will`, `does` (e.g. `isLoading`, `hasError`). Exempt: `asChild`, `prev`, `required`, `rememberMe`.
- No `!!`; use `Boolean(x)`.
- `console.log` warns; `console.warn` and `console.error` are allowed.
- `jsx-a11y`, `@tanstack/query` and `@tanstack/router` plugin rules are on.
- `src/components/ui/**` and `routeTree.gen.ts` are excluded from linting.

Formatting (Prettier, run `pnpm format`): no semicolons, double quotes, 100 columns, one attribute per line, trailing commas, imports sorted in groups (react, third party, `@/` non-features, `@/features/`, relative), Tailwind classes sorted (also inside `cn()` and `cva()`).

## Routing

- Files in `src/routes/` define routes: `createFileRoute("/path")`. Public pages sit at the top level (`login.tsx`, `index.tsx`); the pathless layout `_ProtectedPages.tsx` guards the pages in `_ProtectedPages/`.
- Every path goes through `ROUTES` in `src/app/routes.ts`; add new entries there and link with `to={ROUTES.x}`.
- Loaders prefetch with `context.queryClient.ensureQueryData(xQueryOptions())`. The guard in `_ProtectedPages.tsx` redirects to login and preserves the target (`encodeRedirectUri`).
- `routeTree.gen.ts` is generated. Never hand-edit it; commit the regenerated file.
- The existing guard knows only the BetterAuth organizer session. Participant access (magic link, S2-13) is a different session type; its routing and guard design is a tech-lead decision, ask before building it.

## Data fetching

- Server state lives in TanStack Query. Defaults (`config/react-query.ts`): `retry: 0`, `refetchOnWindowFocus: true`. Do not change them.
- HTTP goes through the shared `api` client in `@/lib/api-client` (`ky` 2: option is `prefix`, not `prefixUrl`; `credentials: "include"`; Nest validation `message` becomes `error.message`; a 401 invalidates the session query). Never create another `ky` instance.
- Authentication calls (sign in, sign up, session) use `authClient` from `features/auth/lib/auth-client.ts`, not `api`.
- Query keys: a key factory per feature. Keys needed by `lib/` or `config/` live in `lib/` (see `lib/auth-keys.ts`) to respect the layer graph.

Pattern for a feature (no existing example yet; this follows CLAUDE.md: API schemas, query options, hooks, components):

```ts
// features/events/api/eventSchemas.ts
import { z } from 'zod';

export const eventSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type EventSummary = z.infer<typeof eventSummarySchema>;
```

```ts
// features/events/api/eventsQueryOptions.ts
import { queryOptions } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

import { eventSummarySchema } from '@/features/events/api/eventSchemas';

export const eventsKeys = {
  all: () => ['events'] as const,
  list: () => [...eventsKeys.all(), 'list'] as const,
};

export const eventsQueryOptions = () =>
  queryOptions({
    queryKey: eventsKeys.list(),
    queryFn: async () =>
      eventSummarySchema.array().parse(await api.get('events').json()),
  });
```

```ts
// features/events/hooks/useCreateEvent.ts  (mutation: invalidate on success, like useSignIn)
export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEventInput) =>
      eventSummarySchema.parse(
        await api.post('events', { json: input }).json(),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: eventsKeys.all() });
    },
  });
}
```

Parse every response with zod. The backend DTO is the contract; keep the schema in sync with it.

## Forms

Copy the structure of `features/auth/components/SignInForm.tsx`: `useForm` + `zodResolver(schema)`, `<Form>` / `FormField` / `FormItem` / `FormLabel` / `FormControl` / `FormMessage` from `@/components/ui/form`, `noValidate` on the `<form>`, a destructive `<Alert>` for the server error, and a submit `Button` with a `Loader2` spinner while pending. Field errors appear at the field and other values are preserved. The component takes `isLoading`, `errorMessage` and `onSubmit` props; the route (or a hook) owns the mutation.

This repo's `form.tsx` is the react-hook-form variant. If the official shadcn skill suggests `FieldGroup`/`Field`, keep the repo's pattern unless the team decides to migrate.

## UI

- Components come from `@/components/ui/*`. Compose them; do not restyle them per feature. Adding one: `pnpm dlx shadcn@latest add <name> --cwd apps/frontend`, then follow the checklist in `DESIGN.md` ("Adding or composing"): the CLI output needs fixing before it is usable.
- Icons: `lucide-react` only (`import { CalendarCog } from "lucide-react"`).
- Tokens only (see `DESIGN.md`). Dark mode is the `.dark` class via `next-themes`; use semantic tokens and it follows.
- Mobile first. The participant flow must work at 360 px without horizontal scroll.
- Loading: `Skeleton`; transient feedback: `sonner` toasts (`Toaster` is in the root route); blocking errors: `Alert`.
- Set the page title with `<Seo title="..." />`.

## Tests

Vitest with jsdom, `globals: true`, `@testing-library/react`, `user-event` and `jest-dom` (`src/test/setup.ts`). Colocate tests next to the source as `*.test.ts(x)`. `pnpm frontend test:ci` runs them once. Environment: `import.meta.env` is validated in `config/env.ts`; set the two `VITE_*` variables when a test imports code that reads `env`.

New env variable: add it to the zod schema in `config/env.ts` and to `apps/frontend/.env.example`. In production the frontend receives the API URL at build time.
