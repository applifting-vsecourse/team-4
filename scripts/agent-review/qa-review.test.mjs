import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureQaReviewRequest } from './qa-review.mjs';
import { readyMarker, requirementsMarker } from '../delivery/lib.mjs';

function fixture(options = {}) {
  const sha = 'a'.repeat(40);
  const pr = {
    number: 12,
    user: { login: options.author ?? 'darebakdavca' },
    head: { sha },
    state: 'open',
    base: { ref: 'main' },
    draft: false,
  };
  const issue = {
    number: 78,
    requirements: { id: 'scope-grant', submitted_at: '2000-01-01' },
    requirementsVersion: 'version',
  };
  const approvalId =
    pr.user.login === 'darebakdavca' ? 'author-exempt:version' : 'scope-grant';
  const comment = (body, created_at) => ({
    user: { login: 'github-actions[bot]' },
    body: body + '\n',
    created_at,
  });
  const comments = [
    comment(requirementsMarker(12, sha, 78, approvalId), '2001-01-01'),
    comment(
      `<!-- agent-review-scope issue=78 -->\n<!-- agent-review pr=12 sha=${sha} result=pass attempt=1 -->`,
      '2002-01-01',
    ),
    comment(readyMarker(12, sha, 78), '2003-01-01'),
  ];
  const reviewer =
    pr.user.login === 'MatejKrones' ? 'darebakdavca' : 'MatejKrones';
  const reviews = options.approval
    ? [
        {
          id: 1,
          user: { login: reviewer },
          state: options.reviewState ?? 'APPROVED',
          commit_id: options.reviewSha ?? sha,
          submitted_at: options.approvalTime ?? '2004-01-01',
        },
      ]
    : [];
  const requests = [...(options.pending ?? [])];
  const calls = [];
  let fail = options.fail;
  const api = async (path, opts = {}) => {
    calls.push({ path, ...opts });
    if (path.includes('/reviews?')) return reviews;
    if (path.includes('/comments?')) return comments;
    if (path === '/repos/owner/repo/pulls/12')
      return {
        ...pr,
        ...options.current,
        head: { sha: options.head ?? sha },
      };
    if (path.includes('/requested_reviewers?')) {
      const page = Number(
        new URL('https://example.test' + path).searchParams.get('page'),
      );
      return {
        users: requests
          .slice((page - 1) * 100, page * 100)
          .map((login) => ({ login })),
        teams: [],
      };
    }
    assert.equal(opts.method, 'POST');
    assert.equal(path, '/repos/owner/repo/pulls/12/requested_reviewers');
    if (fail) {
      fail = false;
      throw new Error('GitHub request failed');
    }
    requests.push(...opts.body.reviewers);
    return {};
  };
  return {
    calls,
    comments,
    requests,
    run: () =>
      ensureQaReviewRequest({
        api,
        repo: 'owner/repo',
        pr,
        issue,
        dryRun: options.dryRun ?? false,
        log: () => {},
      }),
  };
}

for (const [author, reviewer] of [
  ['darebakdavca', 'MatejKrones'],
  ['developer', 'MatejKrones'],
  ['MatejKrones', 'darebakdavca'],
]) {
  test(`requests ${reviewer} for ${author} and preserves other reviewers`, async () => {
    const f = fixture({ author, pending: ['other-reviewer'] });
    assert.equal(await f.run(), 'requested');
    assert.deepEqual(f.requests, ['other-reviewer', reviewer]);
    assert.equal(await f.run(), 'pending');
    assert.equal(f.calls.filter((c) => c.method === 'POST').length, 1);
  });
}

test('does not duplicate a case-insensitive pending request on later pages', async () => {
  const f = fixture({
    pending: [
      ...Array.from({ length: 100 }, (_, i) => `user${i}`),
      'matejkrones',
    ],
  });
  assert.equal(await f.run(), 'pending');
  assert.equal(
    f.calls.some((c) => c.method === 'POST'),
    false,
  );
});

test('does not re-request valid QA approval after the handoff', async () => {
  const f = fixture({ approval: true });
  assert.equal(await f.run(), 'approved');
  assert.equal(
    f.calls.some((c) => c.path.includes('requested_reviewers')),
    false,
  );
});

for (const options of [
  { approval: true, approvalTime: '2002-06-01' },
  { approval: true, reviewSha: 'b'.repeat(40) },
  { approval: true, reviewState: 'DISMISSED' },
]) {
  test(`re-requests invalid QA evidence: ${JSON.stringify(options)}`, async () => {
    const f = fixture(options);
    assert.equal(await f.run(), 'requested');
  });
}

test('API failure is visible and retry works with the existing handoff', async () => {
  const f = fixture({ fail: true });
  await assert.rejects(f.run(), /GitHub request failed/);
  assert.equal(await f.run(), 'requested');
  assert.equal(await f.run(), 'pending');
});

test('dry run makes no mutations even without a persisted handoff', async () => {
  const f = fixture({ dryRun: true });
  f.comments.pop();
  assert.equal(await f.run(), 'dry-run');
  assert.equal(
    f.calls.some((c) => c.method === 'POST'),
    false,
  );
});

test('a missing handoff cannot send a real request', async () => {
  const f = fixture();
  f.comments.pop();
  await assert.rejects(f.run(), /handoff record missing/);
  assert.equal(
    f.calls.some((c) => c.method === 'POST'),
    false,
  );
});

for (const options of [
  { head: 'b'.repeat(40) },
  { current: { draft: true } },
  { current: { state: 'closed' } },
  { current: { base: { ref: 'other' } } },
]) {
  test(`skips a PR that became ineligible: ${JSON.stringify(options)}`, async () => {
    const f = fixture(options);
    assert.equal(await f.run(), 'stale');
    assert.equal(
      f.calls.some((c) => c.method === 'POST'),
      false,
    );
  });
}

// The PR may be converted to draft after the runner's final scope snapshot.
test('final draft check rejects stored scope approval and handoff without reading or posting requests', async () => {
  const f = fixture({
    author: 'developer',
    approval: true,
    current: { draft: true },
  });
  assert.equal(await f.run(), 'stale');
  assert.equal(
    f.calls.some((c) => c.path.includes('requested_reviewers')),
    false,
  );
  assert.deepEqual(f.requests, []);
});
