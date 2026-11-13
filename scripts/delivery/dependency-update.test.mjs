import test from 'node:test';
import assert from 'node:assert/strict';
import { dependencyScope, isDependencyUpdate } from './dependency-update.mjs';
import {
  evaluate,
  readyMarker,
  requirementsApproval,
  requirementsMarker,
} from './lib.mjs';
import { issueRequirements } from './requirements.mjs';

const repo = 'owner/repo';
const sha = 'b'.repeat(40);
const dependabot = (over = {}) => ({
  number: 40,
  head: { sha, ref: 'dependabot/npm_and_yarn/x', repo: { full_name: repo } },
  base: { ref: 'main' },
  user: { login: 'dependabot[bot]', type: 'Bot' },
  labels: [{ name: 'dependencies' }, { name: 'severity:standard' }],
  draft: false,
  ...over,
});

test('only a standard Dependabot update from this repository is a dependency update', () => {
  assert.equal(isDependencyUpdate(dependabot(), repo), true);
  const rejected = [
    { user: { login: 'developer', type: 'User' } },
    { user: { login: 'dependabot[bot]', type: 'User' } },
    { labels: [{ name: 'severity:standard' }] },
    { labels: [{ name: 'dependencies' }, { name: 'severity:high' }] },
    { labels: [{ name: 'dependencies' }, { name: 'severity:low' }] },
    {
      labels: [
        { name: 'dependencies' },
        { name: 'severity:standard' },
        { name: 'severity:high' },
      ],
    },
    { base: { ref: 'integration/1-x' } },
    { head: { sha, ref: 'x', repo: { full_name: 'fork/repo' } } },
  ];
  for (const over of rejected)
    assert.equal(isDependencyUpdate(dependabot(over), repo), false);
});

const at = (minute) => `2026-01-01T00:${minute}:00Z`;
const bot = { login: 'github-actions[bot]' };
function evidence(pr, { qa = true } = {}) {
  const n = pr.number;
  const comments = [
    {
      user: bot,
      created_at: at('01'),
      body: `${requirementsMarker(n, sha, n, 'severity-standard')}\nrecord`,
    },
    {
      user: bot,
      created_at: at('02'),
      body: `<!-- agent-review-scope issue=${n} -->\n<!-- agent-review pr=${n} sha=${sha} result=pass attempt=1 -->`,
    },
    {
      user: bot,
      created_at: at('03'),
      body: `${readyMarker(n, sha, n)}\nReady for QA`,
    },
  ];
  const reviews = qa
    ? [
        {
          id: 1,
          user: { login: 'MatejKrones' },
          state: 'APPROVED',
          commit_id: sha,
          submitted_at: at('04'),
        },
      ]
    : [];
  return { comments, reviews };
}

test('a dependency update passes with its own scope and the usual evidence', () => {
  const pr = dependabot();
  const issues = [dependencyScope(pr, repo)];
  const ok = evaluate({ pr, issues, ...evidence(pr) });
  assert.deepEqual(ok.reasons, []);
  assert.equal(ok.pass, true);
});

test('a dependency update still needs agent review, readiness and QA', () => {
  const pr = dependabot();
  const issues = [dependencyScope(pr, repo)];
  const noQa = evaluate({ pr, issues, ...evidence(pr, { qa: false }) });
  assert.equal(noQa.pass, false);
  assert.match(noQa.reasons.join(' '), /QA approval/);
  const bare = evaluate({ pr, issues, reviews: [], comments: [] });
  assert.equal(bare.pass, false);
  assert.match(bare.reasons.join(' '), /agent review/);
});

test('a PR without a linked issue and without the exception is still rejected', () => {
  const human = dependabot({ user: { login: 'developer', type: 'User' } });
  const result = evaluate({ pr: human, issues: [], ...evidence(human) });
  assert.equal(result.pass, false);
  assert.match(result.reasons.join(' '), /Link at least one issue/);
  const unlabelled = dependabot({ labels: [{ name: 'severity:standard' }] });
  assert.equal(isDependencyUpdate(unlabelled, repo), false);
  assert.match(
    evaluate({
      pr: unlabelled,
      issues: [],
      reviews: [],
      comments: [],
    }).reasons.join(' '),
    /Link at least one issue/,
  );
});

test('the requirements id agrees between producer and consumer, also after a rereview comment', () => {
  const pr = dependabot({
    title: 'Bump x',
    body: 'Bumps x.',
    updated_at: at('00'),
  });
  const rereview = {
    id: 9,
    user: { login: 'someone' },
    author_association: 'MEMBER',
    body: '/requirements-rereview',
    created_at: at('00'),
  };
  for (const comments of [[], [rereview]]) {
    const found = issueRequirements(pr, comments, []);
    const withScope = {
      ...pr,
      requirements: found.approval,
      requirementsVersion: found.version,
    };
    const id = requirementsApproval(withScope, []).id;
    assert.match(id, /^severity-standard:/);
    const n = pr.number;
    const evidenceComments = [
      {
        user: bot,
        created_at: at('01'),
        body: `${requirementsMarker(n, sha, n, id)}\nrecord`,
      },
      ...evidence(pr).comments.slice(1),
    ];
    const result = evaluate({
      pr: withScope,
      issues: [
        {
          ...dependencyScope(pr, repo),
          requirements: found.approval,
          requirementsVersion: found.version,
        },
      ],
      reviews: evidence(pr).reviews,
      comments: evidenceComments,
    });
    assert.deepEqual(result.reasons, []);
  }
});
