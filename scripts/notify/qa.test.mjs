import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  codeOwnersForPath,
  DONE,
  IN_PROGRESS,
  isDocsOnly,
  linkedIssues,
  mayMove,
  onChecks,
  qaOwnerFor,
  READY_FOR_TESTING,
} from './qa.mjs';

const CODEOWNERS = readFileSync(
  new URL('../../.github/CODEOWNERS', import.meta.url),
  'utf8',
);
const SHA = 'a'.repeat(40);
const OLD = 'b'.repeat(40);
const pr = (overrides = {}) => ({
  number: 500,
  state: 'open',
  draft: false,
  head: { sha: SHA },
  base: { ref: 'main' },
  user: { login: 'rmnskb' },
  requested_reviewers: [],
  ...overrides,
});
const checks = (overrides = {}) => ({
  pr: pr(),
  sha: SHA,
  passed: true,
  paths: ['apps/frontend/src/x.tsx'],
  reviews: [],
  codeowners: CODEOWNERS,
  ...overrides,
});

test('QA follows the largest changed area and skips the PR author', () => {
  assert.equal(
    qaOwnerFor('rmnskb', 506, ['apps/backend/src/x.ts'], CODEOWNERS),
    'MatejKrones',
  );
  assert.equal(
    qaOwnerFor(
      'darebakdavca',
      506,
      ['apps/frontend/e2e/x.spec.ts'],
      CODEOWNERS,
    ),
    'MatejKrones',
  );
  assert.equal(
    qaOwnerFor('JakubHerr', 506, ['apps/frontend/src/x.tsx'], CODEOWNERS),
    'rmnskb',
  );
  assert.equal(
    qaOwnerFor(
      'darebakdavca',
      506,
      ['apps/frontend/src/x.tsx', 'apps/backend/src/x.ts'],
      CODEOWNERS,
    ),
    'rmnskb',
  );
  assert.equal(
    qaOwnerFor(
      'darebakdavca',
      506,
      [
        'apps/frontend/src/a.tsx',
        'apps/frontend/src/b.tsx',
        'apps/backend/src/x.ts',
      ],
      CODEOWNERS,
    ),
    'JakubHerr',
  );
  assert.equal(
    qaOwnerFor(
      'darebakdavca',
      506,
      [
        'apps/frontend/src/a.tsx',
        'apps/backend/src/x.ts',
        'apps/backend/src/y.ts',
      ],
      CODEOWNERS,
    ),
    'rmnskb',
  );
  assert.equal(
    qaOwnerFor(
      'rmnskb',
      506,
      ['apps/frontend/src/x.tsx', 'apps/backend/src/x.ts'],
      CODEOWNERS,
    ),
    'JakubHerr',
  );
  assert.equal(
    qaOwnerFor('external-contributor', 1, ['assets/logo.png'], CODEOWNERS),
    'MatejKrones',
  );
});

test('CODEOWNERS matching uses the most specific last matching pattern', () => {
  assert.deepEqual(
    codeOwnersForPath('apps/frontend/e2e/registration.spec.ts', CODEOWNERS),
    ['MatejKrones', 'JakubHerr'],
  );
  assert.deepEqual(
    codeOwnersForPath('apps/frontend/Dockerfile.prod', CODEOWNERS),
    ['MatejKrones', 'rmnskb'],
  );
});

test('passing checks request a changed-path code owner and move the issue', () => {
  assert.deepEqual(onChecks(checks()), {
    request: 'JakubHerr',
    status: READY_FOR_TESTING,
    reason: 'asking JakubHerr to test',
  });
});

test('nobody is asked twice, and an approval given early is kept', () => {
  const asked = onChecks(
    checks({ pr: pr({ requested_reviewers: [{ login: 'JakubHerr' }] }) }),
  );
  assert.equal(asked.request, null);
  assert.equal(asked.status, READY_FOR_TESTING);
  const early = onChecks(
    checks({
      reviews: [
        { user: { login: 'MatejKrones' }, state: 'APPROVED', commit_id: SHA },
      ],
    }),
  );
  assert.equal(early.request, null);
  assert.match(early.reason, /already approved/);
});

test('an approval of an older commit does not count for the new one', () => {
  const result = onChecks(
    checks({
      reviews: [
        { user: { login: 'darebakdavca' }, state: 'APPROVED', commit_id: OLD },
      ],
    }),
  );
  assert.equal(result.request, 'JakubHerr');
});

test('any teammate approval of the current commit counts as QA', () => {
  const result = onChecks(
    checks({
      reviews: [
        {
          user: { login: 'darebakdavca' },
          state: 'APPROVED',
          commit_id: SHA,
        },
      ],
    }),
  );
  assert.equal(result.request, null);
  assert.equal(result.status, READY_FOR_TESTING);
  assert.match(result.reason, /darebakdavca already approved/);
});

test('approval from outside the team does not count as QA', () => {
  const result = onChecks(
    checks({
      reviews: [
        {
          user: { login: 'outside-reviewer' },
          state: 'APPROVED',
          commit_id: SHA,
        },
      ],
    }),
  );
  assert.equal(result.request, 'JakubHerr');
});

test('drafts, closed PRs and outdated commits are left alone', () => {
  for (const input of [
    checks({ pr: pr({ draft: true }) }),
    checks({ pr: pr({ state: 'closed' }) }),
    checks({ sha: OLD }),
  ]) {
    assert.deepEqual(
      { request: onChecks(input).request, status: onChecks(input).status },
      { request: null, status: null },
    );
  }
});

test('documentation-only PRs ask no tester', () => {
  assert.ok(isDocsOnly(['docs/a.md', 'README.md']));
  assert.ok(!isDocsOnly(['docs/a.md', 'apps/frontend/src/x.tsx']));
  assert.ok(!isDocsOnly([]));
  const result = onChecks(checks({ paths: ['docs/delivery-workflow.md'] }));
  assert.equal(result.request, null);
  assert.equal(result.status, null);
});

test('failed checks ask nobody and pull the issue back from testing', () => {
  const result = onChecks(checks({ passed: false }));
  assert.equal(result.request, null);
  assert.equal(result.status, IN_PROGRESS);
  assert.ok(mayMove(READY_FOR_TESTING, IN_PROGRESS));
  assert.ok(!mayMove('Sprint Backlog', IN_PROGRESS));
});

test('the board only moves forward from statuses before testing', () => {
  assert.ok(mayMove(IN_PROGRESS, READY_FOR_TESTING));
  assert.ok(mayMove('Ready for Code Review', READY_FOR_TESTING));
  assert.ok(!mayMove(DONE, READY_FOR_TESTING));
  assert.ok(!mayMove(READY_FOR_TESTING, READY_FOR_TESTING));
  assert.ok(mayMove(READY_FOR_TESTING, DONE));
  assert.ok(!mayMove(null, DONE));
});

test('linked issues split closing keywords from Refs, ignoring code and comments', () => {
  assert.deepEqual(
    linkedIssues(
      'Closes #12, refs #13\n<!-- Closes #99 -->\n`Fixes #98`\n```\nResolves #97\n```',
    ),
    { closes: [12], refs: [13] },
  );
  assert.deepEqual(linkedIssues('Refs #5\nFixes #5'), {
    closes: [5],
    refs: [],
  });
  assert.deepEqual(linkedIssues(undefined), { closes: [], refs: [] });
});

test("a code owner's approval of this commit covers QA", () => {
  const result = onChecks(
    checks({
      pr: pr({ user: { login: 'MatejKrones' } }),
      reviews: [
        { user: { login: 'rmnskb' }, state: 'APPROVED', commit_id: SHA },
      ],
    }),
  );
  assert.equal(result.request, null);
  assert.equal(result.status, READY_FOR_TESTING);
  assert.match(result.reason, /rmnskb already approved/);
});

test('the author approving their own PR covers nothing', () => {
  const result = onChecks(
    checks({
      reviews: [
        { user: { login: 'rmnskb' }, state: 'APPROVED', commit_id: SHA },
      ],
    }),
  );
  assert.equal(result.request, 'JakubHerr');
});

test('after the tester reviewed this commit, a CI re-run asks nobody and moves nothing', () => {
  for (const state of ['CHANGES_REQUESTED', 'COMMENTED']) {
    const result = onChecks(
      checks({
        reviews: [{ user: { login: 'JakubHerr' }, state, commit_id: SHA }],
      }),
    );
    assert.deepEqual(
      { request: result.request, status: result.status },
      { request: null, status: null },
      state,
    );
  }
});

test('dependency updates and PRs not into main ask no tester', () => {
  for (const input of [
    checks({ pr: pr({ user: { login: 'dependabot[bot]' } }) }),
    checks({ pr: pr({ base: { ref: 'feature/x' } }) }),
  ]) {
    const result = onChecks(input);
    assert.deepEqual(
      { request: result.request, status: result.status },
      { request: null, status: null },
    );
  }
});
