import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// Run the production runner against a persistent in-memory GitHub. Cached bot
// verdicts exercise its real handoff path without calling Copilot or GitHub.
async function scenario(options) {
  const assert = (await import('node:assert/strict')).default;
  const { issueRequirements, scopeMarker } =
    await import('./scripts/delivery/requirements.mjs');
  const { requirementsApproval, requirementsMarker, readyMarker } =
    await import('./scripts/delivery/lib.mjs');
  const sha = 'a'.repeat(40);
  const issue = { number: 78, title: 'Task', body: 'Scope' };
  let status = options.existingHandoff
    ? 'Ready for Testing'
    : 'Ready for Code Review';
  const calls = [];
  const requested = new Map();
  const comments = new Map([[78, []]]);
  const prs = (options.authors ?? ['darebakdavca']).map((author, i) => ({
    number: 12 + i,
    user: { login: author },
    head: { sha },
    state: 'open',
    base: { ref: 'main' },
    draft: options.draft ?? false,
  }));
  const reviews = [
    {
      id: 1,
      user: { login: 'darebakdavca' },
      state: 'APPROVED',
      commit_id: sha,
      submitted_at: '2000-01-01T00:00:00Z',
    },
  ];
  const bot = (body, at = '2001-01-01T00:00:00Z') => ({
    id: calls.length + 10,
    user: { login: 'github-actions[bot]' },
    body,
    created_at: at,
    html_url: 'https://example.test/comment',
  });
  const snapshots = prs.map((pr) => ({
    pr,
    reviews: options.unapproved ? [] : reviews,
  }));
  let scope = issueRequirements(issue, comments.get(78), snapshots);
  if (scope.grantRecord)
    comments
      .get(78)
      .push(bot(scopeMarker('issue-requirements', scope.grantRecord)));
  scope = issueRequirements(issue, comments.get(78), snapshots);
  for (const pr of prs) {
    pr.requirements = scope.approval;
    pr.requirementsVersion = scope.version;
    const approval = requirementsApproval(pr, reviews);
    comments.set(
      pr.number,
      approval
        ? [
            bot(requirementsMarker(pr.number, sha, 78, approval.id) + '\n'),
            bot(
              `<!-- agent-review-scope issue=78 -->\n<!-- agent-review pr=${pr.number} sha=${sha} result=${options.verdictByPr?.[pr.number] ?? options.verdict ?? 'pass'} attempt=${options.verdict === 'error' ? 3 : 1} -->\n`,
              '2002-01-01T00:00:00Z',
            ),
          ]
        : [],
    );
    if (options.existingHandoff)
      comments
        .get(pr.number)
        .push(
          bot(readyMarker(pr.number, sha, 78) + '\n', '2003-01-01T00:00:00Z'),
        );
    if (options.oldHandoff) {
      comments
        .get(pr.number)
        .push(
          bot(
            readyMarker(pr.number, 'b'.repeat(40), 78) + '\n',
            '2003-01-01T00:00:00Z',
          ),
        );
    }
    requested.set(pr.number, []);
  }
  let failed = false;
  const headReads = new Map();
  globalThis.fetch = async (url, opts = {}) => {
    const path = new URL(url).pathname;
    const body = opts.body ? JSON.parse(opts.body) : {};
    let data;
    if (path === '/graphql') {
      if (body.query.includes('organization(login:'))
        data = {
          data: {
            organization: {
              projectV2: {
                id: 'project',
                field: {
                  id: 'field',
                  options: [
                    'In Progress',
                    'Ready for Code Review',
                    'Ready for Testing',
                  ].map((name) => ({ id: name, name })),
                },
                items: {
                  pageInfo: { hasNextPage: false },
                  nodes: [
                    {
                      id: 'item',
                      status: { name: status },
                      content: {
                        ...issue,
                        state: 'OPEN',
                        repository: { nameWithOwner: 'owner/repo' },
                        closedByPullRequestsReferences: {
                          pageInfo: { hasNextPage: false },
                          nodes: prs.map((pr) => ({
                            number: pr.number,
                            state: 'OPEN',
                            repository: { nameWithOwner: 'owner/repo' },
                          })),
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        };
      else if (body.query.includes('updateProjectV2ItemFieldValue')) {
        status = body.variables.option;
        calls.push('status:' + status);
        data = {
          data: {
            updateProjectV2ItemFieldValue: { projectV2Item: { id: 'item' } },
          },
        };
      } else data = { data: { node: { status: { name: status } } } };
    } else if (path.endsWith('/issues/78')) data = issue;
    else if (path.endsWith('/comments')) {
      const number = Number(path.split('/').at(-2));
      if (opts.method === 'POST') {
        data = bot(body.body, new Date().toISOString());
        calls.push(
          body.body.startsWith('<!-- delivery-ready')
            ? 'handoff:' + number
            : 'comment:' + number,
        );
        comments.get(number).push(data);
      } else data = comments.get(number);
    } else if (path.endsWith('/reviews'))
      data = options.unapproved ? [] : reviews;
    else if (path.endsWith('/requested_reviewers')) {
      const number = Number(path.split('/').at(-2));
      if (opts.method === 'POST') {
        calls.push('request:' + number);
        assert.ok(
          comments
            .get(number)
            .some((c) => c.body.startsWith('<!-- delivery-ready')),
        );
        if (options.failOnce && !failed) {
          failed = true;
          return { ok: false, status: 503, text: async () => 'unavailable' };
        }
        requested.get(number).push(...body.reviewers);
      }
      data = {
        users: requested.get(number).map((login) => ({ login })),
        teams: [],
      };
    } else if (/\/pulls\/\d+$/.test(path)) {
      assert.notEqual(
        opts.headers.Accept,
        'application/vnd.github.diff',
        'cached verdict must avoid Copilot',
      );
      const number = Number(path.split('/').at(-1));
      const count = (headReads.get(number) ?? 0) + 1;
      headReads.set(number, count);
      const pr = prs.find((p) => p.number === number);
      data = {
        ...pr,
        head: {
          sha: options.pushDuringReview && count >= 3 ? 'b'.repeat(40) : sha,
        },
      };
    } else throw new Error('Unexpected API: ' + path);
    return { ok: true, json: async () => structuredClone(data) };
  };
  for (let i = 0; i < (options.runs ?? 1); i++) {
    process.exitCode = 0;
    await import(`./scripts/agent-review/run.mjs?qa-test=${i}`);
    calls.push('exit:' + (process.exitCode ?? 0));
  }
  // A simulated API failure is asserted in the result rather than failing the child.
  process.exitCode = 0;
  console.log(
    JSON.stringify({
      status,
      calls,
      requested: Object.fromEntries(requested),
      handoffs: prs.map(
        (pr) =>
          comments
            .get(pr.number)
            .filter((c) => c.body.startsWith('<!-- delivery-ready')).length,
      ),
    }),
  );
}

function run(options = {}) {
  const out = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `await (${scenario.toString()})(${JSON.stringify(options)})`,
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        GITHUB_REPOSITORY: 'owner/repo',
        GITHUB_TOKEN: 'mock',
        PROJECT_TOKEN: 'mock',
        PROJECT_OWNER: 'owner',
        PROJECT_NUMBER: '1',
        DRY_RUN: String(options.dryRun ?? false),
        FORCE: 'false',
        ONLY_ISSUE: '',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );
  return JSON.parse(out.trim().split('\n').at(-1));
}

test('real runner requests the QA owner for every PR only after the handoff', () => {
  const r = run({ authors: ['darebakdavca', 'MatejKrones'], runs: 2 });
  assert.equal(r.status, 'Ready for Testing');
  assert.deepEqual(r.requested, { 12: ['MatejKrones'], 13: ['darebakdavca'] });
  assert.equal(r.calls.filter((c) => c.startsWith('request:')).length, 2);
  assert.deepEqual(r.handoffs, [1, 1]);
  assert.ok(r.calls.indexOf('handoff:12') < r.calls.indexOf('request:12'));
});

test('real runner retries failed requests in Ready for Testing without repeating handoff', () => {
  const r = run({ failOnce: true, runs: 3 });
  assert.deepEqual(r.requested, { 12: ['MatejKrones'] });
  assert.deepEqual(r.handoffs, [1]);
  assert.equal(r.calls.filter((c) => c === 'request:12').length, 2);
  assert.ok(r.calls.includes('exit:1'));
  assert.equal(r.calls.at(-1), 'exit:0');
});

test('a new passed commit gets a new handoff and request despite an old handoff', () => {
  const r = run({ oldHandoff: true });
  assert.deepEqual(r.requested, { 12: ['MatejKrones'] });
  assert.deepEqual(r.handoffs, [2]);
  assert.ok(r.calls.indexOf('handoff:12') < r.calls.indexOf('request:12'));
});

test('one failing PR blocks QA requests for every PR linked to the issue', () => {
  const r = run({
    authors: ['darebakdavca', 'MatejKrones'],
    verdictByPr: { 13: 'findings' },
  });
  assert.deepEqual(r.requested, { 12: [], 13: [] });
  assert.deepEqual(r.handoffs, [0, 0]);
});

test('existing handoffs receive a missing request without a new comment', () => {
  const r = run({ existingHandoff: true });
  assert.deepEqual(r.requested, { 12: ['MatejKrones'] });
  assert.deepEqual(r.handoffs, [1]);
  assert.equal(r.calls.includes('handoff:12'), false);
});

for (const options of [
  { verdict: 'findings' },
  { verdict: 'error' },
  { pushDuringReview: true },
  { draft: true },
  { authors: ['developer'], unapproved: true },
  { authors: ['darebakdavca', 'developer'], verdict: 'findings' },
]) {
  test(`real runner does not request blocked QA: ${JSON.stringify(options)}`, () => {
    const r = run(options);
    assert.equal(
      r.calls.some((c) => c.startsWith('request:') || c.startsWith('handoff:')),
      false,
    );
    assert.ok(r.handoffs.every((n) => n === 0));
  });
}

test('real runner dry run writes no comments, requests or card status', () => {
  const r = run({ dryRun: true });
  assert.equal(
    r.calls.some((c) => /^(request|handoff|status|comment):/.test(c)),
    false,
  );
});
