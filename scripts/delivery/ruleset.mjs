// Preserve the ruleset while moving approval counts into Delivery stages.
export function severityRuleset(current) {
  if (
    current.enforcement !== 'active' ||
    current.target !== 'branch' ||
    !current.conditions?.ref_name?.include?.includes('refs/heads/main')
  )
    throw new Error('Expected an active main branch ruleset');
  const payload = structuredClone(
    Object.fromEntries(
      [
        'name',
        'target',
        'enforcement',
        'conditions',
        'rules',
        'bypass_actors',
      ].map((key) => [key, current[key]]),
    ),
  );
  const checks = payload.rules.find(
    (rule) => rule.type === 'required_status_checks',
  )?.parameters.required_status_checks;
  if (
    !['verify', 'Delivery stages'].every((name) =>
      checks?.some(
        (check) => check.context === name && check.integration_id === 15368,
      ),
    )
  )
    throw new Error(
      'Both required GitHub Actions checks must already be configured',
    );
  const pr = payload.rules.find((rule) => rule.type === 'pull_request');
  if (!pr) throw new Error('PR rule is missing');
  pr.parameters.required_approving_review_count = 0;
  pr.parameters.require_last_push_approval = false;
  pr.parameters.require_extra_approval_for_unattributed_changes = false;
  return payload;
}

export const INTEGRATION_RULESET = 'Protect integration branches';

// The ruleset for feature integration branches. Every change arrives through a
// PR with child-verify and Delivery stages from GitHub Actions; history is never
// rewritten or deleted, which the parent PR's review carry-over relies on. Rebase
// merges are not offered: they replace the reviewed commits. There is no bypass.
export function integrationRuleset() {
  return {
    name: INTEGRATION_RULESET,
    target: 'branch',
    enforcement: 'active',
    conditions: {
      ref_name: { include: ['refs/heads/integration/**'], exclude: [] },
    },
    bypass_actors: [],
    rules: [
      { type: 'deletion' },
      { type: 'non_fast_forward' },
      {
        type: 'pull_request',
        parameters: {
          allowed_merge_methods: ['merge', 'squash'],
          dismiss_stale_reviews_on_push: true,
          require_code_owner_review: false,
          require_last_push_approval: false,
          required_approving_review_count: 0,
          required_review_thread_resolution: true,
        },
      },
      {
        type: 'required_status_checks',
        parameters: {
          do_not_enforce_on_create: true,
          strict_required_status_checks_policy: false,
          required_status_checks: ['child-verify', 'Delivery stages'].map(
            (context) => ({ context, integration_id: 15368 }),
          ),
        },
      },
    ],
  };
}

/**
 * The repository's own integration ruleset to update, or null to create one.
 * More than one with that name is ambiguous and refused.
 */
export function selectIntegrationRuleset(rulesets, repo) {
  const matching = rulesets.filter(
    (rule) => rule.name === INTEGRATION_RULESET && rule.source === repo,
  );
  if (matching.length > 1)
    throw new Error(
      `Expected at most one ruleset named ${INTEGRATION_RULESET}`,
    );
  return matching[0] ?? null;
}

/**
 * Differences between the ruleset GitHub stored and the proposed one: every
 * proposed field of every rule must be stored unchanged.
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
