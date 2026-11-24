// Which Playwright E2E specs a change needs (#499). Pure logic, no I/O: the
// runner (affected.mjs) collects the changed paths and runs Playwright.
//
// Every changed path is classified, first matching rule wins:
//   1. a changed spec runs itself,
//   2. no E2E impact (documentation, stories, unit and database tests),
//   3. the whole suite (shared code, auth, migrations, test infrastructure),
//   4. a product area runs the specs that exercise it,
//   5. anything else runs the whole suite: unknown impact is never skipped.

/** The product areas a spec exercises. Every spec file must be listed. */
export const SPEC_AREAS = {
  'access.spec.ts': ['events', 'registrations'],
  'accommodation-rules.spec.ts': ['accommodation', 'events', 'registrations'],
  'entry.spec.ts': ['landing', 'events'],
  'gender.spec.ts': ['registrations', 'accommodation', 'participant'],
  'layout.spec.ts': ['landing', 'events', 'registrations'],
  'mixed-terms.spec.ts': ['registrations', 'accommodation'],
  'money-path.spec.ts': ['landing', 'events', 'registrations', 'payments'],
  'participant-access.spec.ts': ['participant', 'payments'],
  'participant-notifications.spec.ts': [
    'participant',
    'payments',
    'registrations',
  ],
  'participant-profile.spec.ts': ['participant', 'registrations'],
  'payments.spec.ts': ['payments', 'registrations'],
  'programme.spec.ts': ['programme', 'registrations', 'participant'],
  'publication.spec.ts': ['events'],
  'public-detail.spec.ts': ['events'],
  'qr-payment.spec.ts': ['payments', 'participant', 'registrations'],
  'queue-order.spec.ts': ['accommodation', 'registrations'],
  'registration-changes.spec.ts': ['registrations', 'participant'],
  'registration-needs.spec.ts': ['registrations', 'participant'],
  'registration-questions.spec.ts': [
    'registrations',
    'accommodation',
    'events',
  ],
  'room-assignment.spec.ts': ['accommodation'],
  'roommate-wishes.spec.ts': ['accommodation', 'registrations', 'participant'],
  'room-proposals.spec.ts': ['accommodation'],
  'room-publication.spec.ts': ['accommodation', 'participant'],
  'rooms-management.spec.ts': ['accommodation'],
  'statement-import.spec.ts': ['payments'],
  'term-evaluation.spec.ts': ['accommodation', 'registrations', 'events'],
};

const FE = 'apps/frontend/';
const BE = 'apps/backend/';
/** A literal path for use inside a pattern; route folders contain `$`. */
const esc = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ORG_ROUTES = esc(
  `${FE}src/routes/_ProtectedPages/organizations/$organizationId/`,
);
const EVENT_ROUTES = `${ORG_ROUTES}events/${esc('$eventId')}/`;

/** Paths that cannot affect a running application. */
const NO_IMPACT = [
  /\.md$/,
  /^docs\//,
  /\.stories\.tsx$/,
  /\.(test|spec)\.tsx?$/,
  /\.db-spec\.ts$/,
  new RegExp(`^${FE}src/screens/`),
  new RegExp(`^${FE}\\.storybook/`),
  new RegExp(`^${FE}src/features/[^/]+/fixtures/`),
  new RegExp(`^${FE}src/test/`),
  new RegExp(`^${BE}test/`),
  /^\.github\/(ISSUE_TEMPLATE|pull_request_template|dependabot)/,
  /^\.github\/workflows\/(?!ci\.yml$)/,
  /^scripts\/(review|notify|rules|release|qa)\//,
  /^\.github\/CODEOWNERS$/,
  /^(LICENSE\.txt|AGENTS\.md|CLAUDE\.md|DESIGN\.md|skills-lock\.json)$/,
  /\.xlsx$/,
  new RegExp(`^${BE}prisma/demo/`),
];

/** Paths whose effect reaches every flow, with the reason shown in CI. */
const EVERYTHING = [
  [/^apps\/frontend\/e2e\//, 'E2E test infrastructure'],
  [/^apps\/frontend\/playwright\.config\.ts$/, 'E2E test infrastructure'],
  [/^scripts\/e2e\//, 'E2E test infrastructure'],
  [/^\.github\/workflows\/ci\.yml$/, 'CI configuration'],
  [
    /(^|\/)(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml)$|^\.nvmrc$/,
    'dependencies',
  ],
  [new RegExp(`^${BE}prisma/`), 'database schema or migrations'],
  [
    new RegExp(`^${BE}src/(core|shared|app\\.module\\.ts|main\\.ts)`),
    'shared backend code',
  ],
  [
    new RegExp(`^${BE}src/modules/(organizations|welcome)/`),
    'organization access used by every flow',
  ],
  [new RegExp(`^${FE}src/features/auth/`), 'authentication'],
  [
    new RegExp(
      `^${FE}src/(components|lib|styles|app|config|hooks|assets|main\\.tsx|routeTree\\.gen\\.ts)`,
    ),
    'shared frontend code',
  ],
  [
    new RegExp(
      `^${FE}src/routes/(__root|_ProtectedPages)\\.tsx$|^${FE}src/routes/_ProtectedPages/[^/]+\\.tsx$`,
    ),
    'application layout',
  ],
  [
    new RegExp(
      `^${esc(`${FE}src/routes/_ProtectedPages/organizations/$organizationId.tsx`)}$`,
    ),
    'organization layout',
  ],
  [
    new RegExp(`^${FE}src/features/(organizations|design-system)/`),
    'shared frontend code',
  ],
  [
    /(^|\/)(Dockerfile[^/]*|docker-compose\.yml|nginx\.conf|index\.html|vite\.config\.ts|\.env[^/]*)$/,
    'build or runtime configuration',
  ],
];

/** Area of a product folder; the same name in both apps where they match. */
const FOLDER_AREAS = {
  accommodation: 'accommodation',
  rooms: 'accommodation',
  events: 'events',
  'public-events': 'events',
  registrations: 'registrations',
  payments: 'payments',
  programme: 'programme',
  'participant-access': 'participant',
  'participant-notifications': 'participant',
  'participant-profile': 'participant',
  notifications: 'participant',
  landing: 'landing',
};

/** Routes of the frontend by the area they show. */
const ROUTE_AREAS = [
  [new RegExp(`^${EVENT_ROUTES}(rooms|accommodation)`), 'accommodation'],
  [new RegExp(`^${EVENT_ROUTES}registrations`), 'registrations'],
  [new RegExp(`^${EVENT_ROUTES}(payments|platby)`), 'payments'],
  [new RegExp(`^${EVENT_ROUTES}programme`), 'programme'],
  [new RegExp(`^${EVENT_ROUTES}`), 'events'],
  [new RegExp(`^${ORG_ROUTES}`), 'events'],
  [
    new RegExp(
      `^${FE}src/routes/_ProtectedPages/organizations/(index|new)\\.tsx$`,
    ),
    'landing',
  ],
  [new RegExp(`^${FE}src/routes/(e|events)/`), 'events'],
  [new RegExp(`^${FE}src/routes/my-registrations/`), 'participant'],
  [new RegExp(`^${FE}src/routes/(my-notifications|my-profile)`), 'participant'],
  [new RegExp(`^${FE}src/routes/platba/`), 'payments'],
  [
    new RegExp(
      `^${FE}src/routes/(index|login|signup|for-organizers|for-participants|design-system)\\.tsx$`,
    ),
    'landing',
  ],
];

function areaOf(path) {
  const folder =
    new RegExp(`^${FE}src/features/([^/]+)/`).exec(path) ??
    new RegExp(`^${BE}src/modules/([^/]+)/`).exec(path);
  if (folder) return FOLDER_AREAS[folder[1]] ?? null;
  return ROUTE_AREAS.find(([pattern]) => pattern.test(path))?.[1] ?? null;
}

/**
 * The specs to run for the changed paths.
 *
 * @param {string[]} paths repository-relative changed paths
 * @param {string[]} specFiles spec file names present in apps/frontend/e2e
 * @returns {{ mode: 'all' | 'some' | 'none', specs: string[], reasons: string[] }}
 */
export function selectSpecs(paths, specFiles) {
  const unmapped = specFiles.filter((file) => !(file in SPEC_AREAS));
  if (unmapped.length)
    return {
      mode: 'all',
      specs: [...specFiles].sort(),
      reasons: [`specs without areas in SPEC_AREAS: ${unmapped.join(', ')}`],
    };

  const all = (reason) => ({
    mode: 'all',
    specs: [...specFiles].sort(),
    reasons: [reason],
  });
  const specs = new Set();
  const reasons = [];
  for (const path of paths) {
    const spec = new RegExp(`^${FE}e2e/([^/]+\\.spec\\.ts)$`).exec(path);
    if (spec) {
      if (specFiles.includes(spec[1])) {
        specs.add(spec[1]);
        reasons.push(`${path}: changed spec`);
      }
      continue;
    }
    if (NO_IMPACT.some((pattern) => pattern.test(path))) continue;
    const everything = EVERYTHING.find(([pattern]) => pattern.test(path));
    if (everything) return all(`${path}: ${everything[1]}`);
    const area = areaOf(path);
    if (!area) return all(`${path}: impact unknown`);
    const matched = specFiles.filter((file) => SPEC_AREAS[file].includes(area));
    for (const file of matched) specs.add(file);
    reasons.push(`${path}: area ${area}`);
  }
  return specs.size
    ? { mode: 'some', specs: [...specs].sort(), reasons }
    : {
        mode: 'none',
        specs: [],
        reasons: reasons.length ? reasons : ['no change affects the app'],
      };
}
