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
