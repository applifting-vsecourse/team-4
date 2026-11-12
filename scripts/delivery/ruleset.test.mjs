import test from 'node:test';
import assert from 'node:assert/strict';
import { severityRuleset } from './ruleset.mjs';
function fixture() {
  return {
    name: 'Protect main',
    target: 'branch',
    enforcement: 'active',
    conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } },
    bypass_actors: [],
    id: 123,
    rules: [
      { type: 'deletion' },
      { type: 'non_fast_forward' },
      {
        type: 'required_status_checks',
        parameters: {
          strict_required_status_checks_policy: false,
          required_status_checks: ['verify', 'Delivery stages'].map(
            (context) => ({ context, integration_id: 15368 }),
          ),
        },
      },
      {
        type: 'pull_request',
        parameters: {
          required_approving_review_count: 1,
          require_last_push_approval: true,
          require_extra_approval_for_unattributed_changes: true,
          dismiss_stale_reviews_on_push: true,
          required_review_thread_resolution: true,
          require_code_owner_review: false,
        },
      },
    ],
  };
}
test('installation changes only blanket approval rules and preserves all other protections', () => {
  const current = fixture();
  const result = severityRuleset(current);
  const expected = structuredClone(current);
  delete expected.id;
  Object.assign(expected.rules.at(-1).parameters, {
    required_approving_review_count: 0,
    require_last_push_approval: false,
    require_extra_approval_for_unattributed_changes: false,
  });
  assert.deepEqual(result, expected);
  assert.equal(
    current.rules.at(-1).parameters.required_approving_review_count,
    1,
  );
});
test('installation refuses missing or incorrectly sourced mandatory checks and inactive rules', () => {
  for (const mutate of [
    (ruleset) => {
      ruleset.enforcement = 'disabled';
    },
    (ruleset) => {
      ruleset.conditions.ref_name.include = ['refs/heads/other'];
    },
    (ruleset) => {
      ruleset.rules[2].parameters.required_status_checks.pop();
    },
    (ruleset) => {
      ruleset.rules[2].parameters.required_status_checks[0].integration_id = 1;
    },
  ]) {
    const current = fixture();
    mutate(current);
    assert.throws(() => severityRuleset(current));
  }
});

test('the integration ruleset protects history and requires the gates the carry-over checks', async () => {
  const { integrationRuleset, INTEGRATION_RULESET } =
    await import('./ruleset.mjs');
  const { INTEGRATION_RULES, INTEGRATION_CHECKS } =
    await import('./feature-github.mjs');
  const ruleset = integrationRuleset();
  assert.equal(ruleset.name, INTEGRATION_RULESET);
  assert.equal(ruleset.enforcement, 'active');
  assert.deepEqual(ruleset.bypass_actors, []);
  assert.deepEqual(ruleset.conditions.ref_name.include, [
    'refs/heads/integration/**',
  ]);
  // Exactly what integratedReview requires before review carries over.
  assert.deepEqual(
    ruleset.rules.map((rule) => rule.type).sort(),
    [...INTEGRATION_RULES].sort(),
  );
  const checks = ruleset.rules.find(
    (rule) => rule.type === 'required_status_checks',
  ).parameters;
  assert.deepEqual(
    checks.required_status_checks.map((c) => c.context).sort(),
    [...INTEGRATION_CHECKS].sort(),
  );
  assert.ok(
    checks.required_status_checks.every((c) => c.integration_id === 15368),
  );
  // A new integration branch starts at main, before any check could run.
  assert.equal(checks.do_not_enforce_on_create, true);
  const pr = ruleset.rules.find((rule) => rule.type === 'pull_request');
  // Rebase merges replace the reviewed commits, so they are not offered.
  assert.deepEqual(pr.parameters.allowed_merge_methods, ['merge', 'squash']);
  assert.equal(pr.parameters.required_approving_review_count, 0);
});

test('the installer updates only its own integration ruleset, never Protect main', async () => {
  const { selectIntegrationRuleset, INTEGRATION_RULESET } =
    await import('./ruleset.mjs');
  const main = { id: 1, name: 'Protect main', source: 'owner/repo' };
  const own = { id: 2, name: INTEGRATION_RULESET, source: 'owner/repo' };
  const inherited = { id: 3, name: INTEGRATION_RULESET, source: 'owner' };
  assert.equal(selectIntegrationRuleset([main], 'owner/repo'), null);
  assert.equal(selectIntegrationRuleset([main, inherited], 'owner/repo'), null);
  assert.equal(
    selectIntegrationRuleset([main, own, inherited], 'owner/repo'),
    own,
  );
  assert.throws(() =>
    selectIntegrationRuleset([own, { ...own, id: 4 }], 'owner/repo'),
  );
});

test('the read-back fails unless GitHub stored every proposed rule unchanged', async () => {
  const { integrationRuleset, rulesetDifferences } =
    await import('./ruleset.mjs');
  const proposed = integrationRuleset();
  const stored = () => ({
    id: 2,
    source: 'owner/repo',
    ...structuredClone(proposed),
  });
  assert.deepEqual(rulesetDifferences(stored(), proposed), []);
  const change = (edit) => {
    const ruleset = stored();
    edit(ruleset);
    return rulesetDifferences(ruleset, proposed);
  };
  const rule = (ruleset, type) =>
    ruleset.rules.find((r) => r.type === type).parameters;
  assert.deepEqual(
    change((r) => rule(r, 'pull_request').allowed_merge_methods.push('rebase')),
    ['pull_request.allowed_merge_methods'],
  );
  assert.deepEqual(
    change(
      (r) => delete rule(r, 'required_status_checks').do_not_enforce_on_create,
    ),
    ['required_status_checks.do_not_enforce_on_create'],
  );
  assert.deepEqual(
    change((r) =>
      rule(r, 'required_status_checks').required_status_checks.pop(),
    ),
    ['required_status_checks.required_status_checks'],
  );
  assert.deepEqual(
    change((r) => (r.rules = r.rules.filter((x) => x.type !== 'deletion'))),
    ['rules'],
  );
  assert.deepEqual(
    change((r) => r.bypass_actors.push({ actor_id: 5 })),
    ['bypass_actors'],
  );
  assert.deepEqual(
    change((r) => (r.enforcement = 'evaluate')),
    ['enforcement'],
  );
  assert.deepEqual(
    change((r) => (r.conditions.ref_name.include = ['~ALL'])),
    ['conditions'],
  );
});
