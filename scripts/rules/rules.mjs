// The repository rules that guard `main` (#499). GitHub enforces them
// natively; there is no custom merge check. install.mjs applies them.

export const MAIN_RULESET = 'Protect main';
/** Retired with feature integration branches (ADR-0005). */
export const RETIRED_RULESETS = ['Protect integration branches'];
/** GitHub Actions, so a check of the same name from another app cannot pass. */
const ACTIONS_APP = 15368;

/**
 * Every PR into main: CI passed, one approval of the latest push by someone
 * other than its author or last pusher (an older approval is dismissed by a
 * new commit), resolved conversations, and the merge through a merge queue
 * that runs the required checks, the whole E2E suite included, on the merge
 * result. CODEOWNERS guides reviewer assignment but is not a merge gate.
 */
export function mainRuleset() {
  return {
    name: MAIN_RULESET,
    target: 'branch',
    enforcement: 'active',
    conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } },
    bypass_actors: [],
    rules: [
      { type: 'deletion' },
      { type: 'non_fast_forward' },
      {
        type: 'pull_request',
        parameters: {
          allowed_merge_methods: ['merge'],
          dismiss_stale_reviews_on_push: true,
          require_code_owner_review: false,
          require_last_push_approval: true,
          required_approving_review_count: 1,
          required_review_thread_resolution: true,
        },
      },
      {
        type: 'required_status_checks',
        parameters: {
          do_not_enforce_on_create: false,
          // The merge queue tests the merge result, so a PR need not be up to date.
          strict_required_status_checks_policy: false,
          required_status_checks: [
            { context: 'verify', integration_id: ACTIONS_APP },
          ],
        },
      },
      {
        type: 'merge_queue',
        parameters: {
          merge_method: 'MERGE',
          grouping_strategy: 'ALLGREEN',
          max_entries_to_build: 5,
          min_entries_to_merge: 1,
          max_entries_to_merge: 5,
          min_entries_to_merge_wait_minutes: 0,
          check_response_timeout_minutes: 60,
        },
      },
    ],
  };
}

/** The one ruleset of this repository with the name, or null; several are refused. */
export function selectRuleset(rulesets, repo, name) {
  const matching = rulesets.filter(
    (rule) => rule.name === name && rule.source === repo,
  );
  if (matching.length > 1)
    throw new Error(`Expected at most one ruleset named ${name}`);
  return matching[0] ?? null;
}

/**
 * Differences between the ruleset GitHub stored and the proposed one: every
 * proposed field of every rule must be stored unchanged, with no bypass.
 */
export function rulesetDifferences(stored, proposed) {
  const differences = [];
  for (const key of ['name', 'target', 'enforcement'])
    if (stored[key] !== proposed[key]) differences.push(key);
  if (stored.bypass_actors?.length) differences.push('bypass_actors');
  if (
    JSON.stringify(stored.conditions?.ref_name?.include) !==
    JSON.stringify(proposed.conditions.ref_name.include)
  )
    differences.push('conditions');
  const types = (rules) =>
    rules
      .map((rule) => rule.type)
      .sort()
      .join();
  if (types(stored.rules ?? []) !== types(proposed.rules))
    differences.push('rules');
  for (const rule of proposed.rules) {
    const actual = stored.rules?.find((r) => r.type === rule.type)?.parameters;
    for (const [key, value] of Object.entries(rule.parameters ?? {}))
      if (JSON.stringify(actual?.[key]) !== JSON.stringify(value))
        differences.push(`${rule.type}.${key}`);
  }
  return differences;
}

/** CODEOWNERS entries used for area ownership and default QA routing. */
export const OWNERSHIP_RULES = [
  { path: '/.github/', owners: ['@MatejKrones', '@rmnskb'] },
  { path: '/scripts/', owners: ['@MatejKrones', '@rmnskb'] },
  { path: '/package.json', owners: ['@MatejKrones', '@rmnskb'] },
  { path: '/pnpm-lock.yaml', owners: ['@MatejKrones', '@rmnskb'] },
  { path: '/pnpm-workspace.yaml', owners: ['@MatejKrones', '@rmnskb'] },
  { path: '/apps/*/package.json', owners: ['@MatejKrones', '@rmnskb'] },
  { path: '/docker-compose.yml', owners: ['@MatejKrones', '@rmnskb'] },
  { path: '/apps/*/docker-compose.yml', owners: ['@MatejKrones', '@rmnskb'] },
  { path: '/apps/*/Dockerfile*', owners: ['@MatejKrones', '@rmnskb'] },
  { path: '/apps/frontend/nginx.conf', owners: ['@MatejKrones', '@rmnskb'] },
  { path: '/apps/*/.env*', owners: ['@MatejKrones', '@rmnskb'] },
  {
    path: '/apps/backend/prisma/migrations/',
    owners: ['@MatejKrones', '@rmnskb'],
  },
  { path: '/docs/adr/', owners: ['@MatejKrones', '@rmnskb'] },
  { path: '/apps/backend/', owners: ['@MatejKrones', '@rmnskb'] },
  { path: '/apps/frontend/', owners: ['@JakubHerr', '@rmnskb'] },
  { path: '/apps/frontend/e2e/', owners: ['@JakubHerr', '@MatejKrones'] },
  {
    path: '/apps/backend/src/core/email/',
    owners: ['@MatejKrones', '@rmnskb'],
  },
  {
    path: '/apps/backend/src/modules/registrations/services/participant-result-mail.service.ts',
    owners: ['@MatejKrones', '@rmnskb'],
  },
  {
    path: '/apps/backend/src/modules/registrations/participant-result-mail.db-spec.ts',
    owners: ['@MatejKrones', '@rmnskb'],
  },
  {
    path: '/apps/backend/src/testing/confirmation-mail.ts',
    owners: ['@MatejKrones', '@rmnskb'],
  },
  { path: '/docs/local-qa.md', owners: ['@MatejKrones', '@rmnskb'] },
  { path: '/CLAUDE.md', owners: ['@MatejKrones', '@rmnskb'] },
  { path: '/docs/delivery-workflow.md', owners: ['@MatejKrones', '@rmnskb'] },
];

/** Paths CODEOWNERS is missing or assigns to the wrong co-owners. */
export function codeownersProblems(text) {
  const lines = new Map(
    text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const [path, ...owners] = line.split(/\s+/);
        return [path, owners.sort().join(' ')];
      }),
  );
  return OWNERSHIP_RULES.filter(
    ({ path, owners }) => lines.get(path) !== [...owners].sort().join(' '),
  ).map(({ path }) => path);
}

/**
 * What the installer will do, or why it refuses. `stored` is the stored main
 * ruleset (null when there is none); the trees are the git object ids of
 * scripts/rules in this checkout and on origin/main.
 */
export function planInstall({
  repo,
  rulesets,
  stored,
  codeowners,
  localTree,
  trustedTree,
}) {
  if (localTree !== trustedTree)
    return {
      refuse: 'scripts/rules differ from origin/main; merge them first.',
    };
  const problems = codeownersProblems(codeowners);
  if (problems.length)
    return {
      refuse: `CODEOWNERS on main does not give the required owners: ${problems.join(', ')}`,
    };
  const current = selectRuleset(rulesets, repo, MAIN_RULESET);
  return {
    main: current ? current.id : null,
    changes: stored ? rulesetDifferences(stored, mainRuleset()) : ['create'],
    retired: RETIRED_RULESETS.map((name) =>
      selectRuleset(rulesets, repo, name),
    ).filter(Boolean),
  };
}
