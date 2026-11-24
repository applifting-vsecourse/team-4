import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  codeownersProblems,
  mainRuleset,
  rulesetDifferences,
  selectRuleset,
} from './rules.mjs';

const rule = (type) => mainRuleset().rules.find((r) => r.type === type);

test('a PR needs one approval of its latest push from someone else', () => {
  const pr = rule('pull_request').parameters;
  assert.equal(pr.required_approving_review_count, 1);
  // A new commit dismisses older approvals; its pusher cannot approve it.
  assert.equal(pr.dismiss_stale_reviews_on_push, true);
  assert.equal(pr.require_last_push_approval, true);
  assert.equal(pr.require_code_owner_review, true);
  assert.equal(pr.required_review_thread_resolution, true);
});

test('only verify from GitHub Actions is required, and the queue merges', () => {
  const checks = rule('required_status_checks').parameters;
  assert.deepEqual(checks.required_status_checks, [
    { context: 'verify', integration_id: 15368 },
  ]);
  assert.equal(rule('merge_queue').parameters.merge_method, 'MERGE');
  assert.deepEqual(rule('pull_request').parameters.allowed_merge_methods, [
    'merge',
  ]);
  assert.deepEqual(mainRuleset().bypass_actors, []);
});

test('a stored ruleset matching the proposal has no differences', () => {
  const stored = structuredClone(mainRuleset());
  stored.rules.find(
    (r) => r.type === 'pull_request',
  ).parameters.required_reviewers = [];
  assert.deepEqual(rulesetDifferences(stored, mainRuleset()), []);
});

test('the old Protect main is reported field by field', () => {
  const old = {
    name: 'Protect main',
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
          allowed_merge_methods: ['merge', 'squash', 'rebase'],
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
          do_not_enforce_on_create: false,
          strict_required_status_checks_policy: false,
          required_status_checks: [
            { context: 'verify', integration_id: 15368 },
            { context: 'Delivery stages', integration_id: 15368 },
          ],
        },
      },
    ],
  };
  const differences = rulesetDifferences(old, mainRuleset());
  for (const expected of [
    'rules',
    'pull_request.allowed_merge_methods',
    'pull_request.require_code_owner_review',
    'pull_request.require_last_push_approval',
    'pull_request.required_approving_review_count',
    'required_status_checks.required_status_checks',
    'merge_queue.merge_method',
  ])
    assert.ok(differences.includes(expected), expected);
});

test('a bypass actor is a difference', () => {
  const stored = {
    ...structuredClone(mainRuleset()),
    bypass_actors: [{ actor_id: 1 }],
  };
  assert.deepEqual(rulesetDifferences(stored, mainRuleset()), [
    'bypass_actors',
  ]);
});

test("only this repository's ruleset counts, and duplicates are refused", () => {
  const repo = 'org/repo';
  const list = [
    { id: 1, name: 'Protect main', source: 'org' },
    { id: 2, name: 'Protect main', source: repo },
  ];
  assert.equal(selectRuleset(list, repo, 'Protect main').id, 2);
  assert.equal(selectRuleset(list, repo, 'Other'), null);
  assert.throws(() =>
    selectRuleset(
      [...list, { id: 3, name: 'Protect main', source: repo }],
      repo,
      'Protect main',
    ),
  );
});

test('CODEOWNERS gives every owned path to both owners', () => {
  assert.deepEqual(
    codeownersProblems(readFileSync('.github/CODEOWNERS', 'utf8')),
    [],
  );
  assert.deepEqual(
    codeownersProblems(
      '/docs/adr/ @rmnskb\n/scripts/ @darebakdavca @rmnskb\n',
    ).slice(0, 2),
    ['/.github/', '/package.json'],
  );
  assert.ok(codeownersProblems('/docs/adr/ @rmnskb\n').includes('/docs/adr/'));
});
