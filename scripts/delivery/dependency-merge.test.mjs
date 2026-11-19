import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mergesAutomatically,
  reconcileAutoMerge,
} from './dependency-merge.mjs';

const repo = 'owner/repo';
const sha = 'b'.repeat(40);
const dependabot = (over = {}) => ({
  number: 40,
  node_id: 'PR_40',
  state: 'open',
  head: { sha, ref: 'dependabot/npm_and_yarn/x', repo: { full_name: repo } },
  base: { ref: 'main' },
  user: { login: 'dependabot[bot]', type: 'Bot' },
  labels: [{ name: 'dependencies' }, { name: 'severity:standard' }],
  draft: false,
  auto_merge: null,
  ...over,
});
const own = [{ author: { login: 'dependabot[bot]' } }];

function harness(pr, commits = own) {
  const mutations = [];
  return {
    mutations,
    args: {
      repo,
      number: pr.number,
      api: async (path) => (path.includes('/commits') ? commits : pr),
      graphql: async (query, variables) => mutations.push({ query, variables }),
    },
  };
}

test('a standard Dependabot PR with only Dependabot commits merges automatically', () => {
  assert.equal(mergesAutomatically(dependabot(), own, repo), true);
});

test('drafts, other classifications and human commits never merge automatically', () => {
  for (const [pr, commits] of [
    [dependabot({ draft: true }), own],
    [dependabot({ state: 'closed' }), own],
    [
      dependabot({
        labels: [{ name: 'dependencies' }, { name: 'severity:high' }],
      }),
      own,
    ],
    [dependabot({ user: { login: 'developer', type: 'User' } }), own],
    [dependabot(), [...own, { author: { login: 'developer' } }]],
    [dependabot(), [{ author: null }]],
    [dependabot(), []],
  ])
    assert.equal(mergesAutomatically(pr, commits, repo), false);
});

test('auto-merge is enabled for the current head and needs no approval', async () => {
  const { args, mutations } = harness(dependabot());
  assert.equal(await reconcileAutoMerge(args), 'enabled');
  assert.deepEqual(mutations[0].variables, { id: 'PR_40', sha });
  assert.match(mutations[0].query, /enablePullRequestAutoMerge/);
});

test('an enabled auto-merge is left alone', async () => {
  const { args, mutations } = harness(dependabot({ auto_merge: {} }));
  assert.equal(await reconcileAutoMerge(args), 'unchanged');
  assert.equal(mutations.length, 0);
});

test('a changed commit or classification disables auto-merge', async () => {
  for (const pr of [
    dependabot({
      auto_merge: {},
      labels: [{ name: 'dependencies' }, { name: 'severity:high' }],
    }),
    dependabot({ auto_merge: {}, draft: true }),
  ]) {
    const { args, mutations } = harness(pr);
    assert.equal(await reconcileAutoMerge(args), 'disabled');
    assert.match(mutations[0].query, /disablePullRequestAutoMerge/);
  }
  const { args, mutations } = harness(dependabot({ auto_merge: {} }), [
    ...own,
    { author: { login: 'developer' } },
  ]);
  assert.equal(await reconcileAutoMerge(args), 'disabled');
  assert.equal(mutations.length, 1);
});

test("a person's PR with auto-merge enabled is left alone", async () => {
  const { args, mutations } = harness(
    dependabot({ user: { login: 'developer', type: 'User' }, auto_merge: {} }),
  );
  assert.equal(await reconcileAutoMerge(args), 'skipped');
  assert.equal(mutations.length, 0);
});

test('a PR whose checks already passed is merged directly', async () => {
  const merged = [];
  const { args } = harness(dependabot());
  args.graphql = async () => {
    throw new Error('Pull request is in clean status');
  };
  args.merge = async (sha) => merged.push(sha);
  assert.equal(await reconcileAutoMerge(args), 'merged');
  assert.deepEqual(merged, [sha]);
});

test('an ineligible PR without auto-merge is skipped', async () => {
  const { args, mutations } = harness(dependabot({ draft: true }));
  assert.equal(await reconcileAutoMerge(args), 'skipped');
  assert.equal(mutations.length, 0);
});
