import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ensureRequirementsReviewRequest,
  requirementsRequestMarker,
} from './requirements-review.mjs';
import { requirementsReviewerFor } from '../delivery/lib.mjs';

for (const [author, expected] of [
  ['darebakdavca', 'rmnskb'],
  ['rmnskb', 'darebakdavca'],
  ['developer', 'darebakdavca'],
]) {
  test(`selects a requirements approver other than ${author}`, () => {
    assert.equal(requirementsReviewerFor(author), expected);
  });
}

function fixture(options = {}) {
  const sha = 'a'.repeat(40);
  const pr = {
    number: 12,
    user: { login: options.author ?? 'darebakdavca' },
    labels: [{ name: 'severity:high' }],
    head: { sha },
    state: 'open',
    base: { ref: 'main' },
    draft: false,
  };
  const issue = {
    number: 78,
    requirements: options.requirements ?? null,
    requirementsVersion: 'version',
  };
  const reviews = [...(options.reviews ?? [])];
  const comments = [...(options.comments ?? [])];
  const requested = [...(options.pending ?? [])];
  const calls = [];
  const api = async (path, request = {}) => {
    calls.push({ path, ...request });
    if (path.includes('/reviews?')) return reviews;
    if (path.includes('/comments?')) return comments;
    if (path === '/repos/owner/repo/pulls/12')
      return {
        ...pr,
        ...options.current,
        head: { sha: options.head ?? sha },
      };
    if (path.includes('/requested_reviewers?'))
      return {
        users: requested.map((login) => ({ login })),
        teams: [],
      };
    if (path === '/repos/owner/repo/issues/12/comments') {
      comments.push({
        user: { login: 'github-actions[bot]' },
        body: request.body.body,
      });
      return {};
    }
    assert.equal(path, '/repos/owner/repo/pulls/12/requested_reviewers');
    requested.push(...request.body.reviewers);
    return {};
  };
  return {
    calls,
    comments,
    requested,
    run: () =>
      ensureRequirementsReviewRequest({
        api,
        repo: 'owner/repo',
        pr,
        issue,
        dryRun: options.dryRun ?? false,
        log: () => {},
      }),
  };
}

test('requests the non-author approver and comments on the PR once', async () => {
  const f = fixture();
  assert.equal(await f.run(), 'requested');
  assert.deepEqual(f.requested, ['rmnskb']);
  assert.match(f.comments[0].body, /@rmnskb, please approve this PR/);
  assert.match(f.comments[0].body, /\/requirements-approve/);
  assert.ok(
    f.comments[0].body.startsWith(
      requirementsRequestMarker(12, 'a'.repeat(40), 78),
    ),
  );
  assert.equal(await f.run(), 'pending');
  assert.equal(f.comments.length, 1);
  assert.equal(f.calls.filter((call) => call.method === 'POST').length, 2);
});

test('uses David when Bogdan authored the PR', async () => {
  const f = fixture({ author: 'rmnskb' });
  assert.equal(await f.run(), 'requested');
  assert.deepEqual(f.requested, ['darebakdavca']);
  assert.match(f.comments[0].body, /@darebakdavca, please approve this PR/);
});

test('does not duplicate a pending reviewer request', async () => {
  const f = fixture({ pending: ['rmnskb'] });
  assert.equal(await f.run(), 'pending');
  assert.equal(f.calls.filter((call) => call.method === 'POST').length, 1);
  assert.equal(f.comments.length, 1);
});

test('does not assign a reviewer after scope approval appears', async () => {
  const f = fixture({
    requirements: {
      id: 'scope:approved',
      submitted_at: '2026-11-14T12:39:00Z',
      reviewer: 'rmnskb',
    },
    reviews: [
      {
        id: 3,
        user: { login: 'rmnskb' },
        state: 'APPROVED',
        commit_id: 'a'.repeat(40),
        submitted_at: '2026-11-14T12:40:00Z',
      },
    ],
  });
  assert.equal(await f.run(), 'stale');
  assert.equal(f.comments.length, 0);
  assert.deepEqual(f.requested, []);
});

test('skips stale, draft, or non-main PRs', async () => {
  for (const options of [
    { head: 'b'.repeat(40) },
    { current: { draft: true } },
    { current: { base: { ref: 'feature' } } },
  ]) {
    const f = fixture(options);
    assert.equal(await f.run(), 'stale');
    assert.equal(f.comments.length, 0);
    assert.deepEqual(f.requested, []);
  }
});
