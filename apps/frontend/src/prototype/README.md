# Page previews and the clickable prototype

Storybook runs the whole app here, not just components: the real route tree, loaders and pages from `src/routes`, on an in-memory backend behind MSW. A page story is the actual page at a URL, and its links lead on to the other pages, so any story is also a starting point for clicking through the app.

In Storybook's sidebar:

- **Prototype / Clickable app**: free play. The floating _Prototype_ panel has the address bar, a jump menu (public links, the participant area) and the mailbox the backend "sends" magic links to.
- **Workflows**: journeys over several screens, scripted as `play` functions with labelled steps. Step through them in the Interactions panel, or stop the play and click on yourself.
- **Pages**: every route in its states (filled, empty, loading, error, validation, mobile, dark).

The controls panel switches the data (`scenario`), who is signed in (`organizer`, `participant`), the network delay (`latency`) and the server (`isServerDown`).

## Files

| File                         | What                                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| `PrototypeApp.tsx`           | The app with a memory history and a fresh backend, query cache and storage per story      |
| `PrototypeDock.tsx`          | The floating controls                                                                     |
| `mockBackend/MockBackend.ts` | The API in memory: records, rules and the views each endpoint returns                     |
| `mockBackend/domain.ts`      | Business rules restated from `apps/backend` (opening, capacity, waitlist, payment states) |
| `mockBackend/handlers.ts`    | MSW handlers for every endpoint the frontend calls, BetterAuth included                   |
| `mockBackend/scenarios.ts`   | The `demo` and `blank` worlds and the ids stories navigate by (`DEMO`)                    |
| `prototypeStories.ts`        | Shared meta, URLs and play helpers (`fill`, `pickDate`, `dock`, waits, `knownIssues`)     |
| `pages/`, `workflows/`       | The stories                                                                               |

## Writing a page story

Spread `prototypeMeta`, set a `title` and the `route` arg, and pick who is signed in:

```tsx
const meta = {
  ...prototypeMeta,
  title: "Pages/Organizer/Event management",
  args: { ...prototypeMeta.args, organizer: "jana", route: urls.event(DEMO.summerCamp) },
} satisfies Meta<typeof prototypeMeta.component>
```

For a state the data does not produce, override one endpoint in `beforeEach`; it takes precedence over the backend: `msw.use(http.get(MOCK_API.event, () => HttpResponse.json({}, { status: 500 })))`.

A story without its own `play` waits until the page has loaded, so the a11y check sees the page and not the route's spinner. A `play` that changes things should end on what it asserts.

## Keeping it true to the backend

- Every answer is parsed with the feature's zod schema before it is sent, so a contract change that the mock misses fails the stories.
- The rules in `domain.ts` and `MockBackend.ts` are copies. When a backend rule changes (opening conditions, capacity, payment states, isolation, magic links), change the copy and `MockBackend.test.ts` with it.

## Lessons from writing the plays

- Wait for a page before clicking on it. A link React has just removed from the page is followed by the browser itself, which navigates Storybook's iframe away and kills the test run.
- While a dialog, menu or select closes, Radix keeps the rest of the page `aria-hidden`; `waitForOverlaysToClose` before querying it.
- Czech amounts contain no-break spaces. Text queries normalise them, accessible-name queries do not: use `/3\s900\sKč/`.
- The kit's `DatePicker` cannot go past the end of the current year (react-day-picker's default with year dropdowns), so `pickableDates()` stays within it.
