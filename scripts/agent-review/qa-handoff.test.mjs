import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// Run the production runner against a persistent in-memory GitHub. Cached bot
// verdicts exercise its real handoff path without calling Copilot or GitHub.
async function scenario(options) {
  const assert = (await import('node:assert/strict')).default;
  let eventDir;
  if (options.eventPr) {
    const fs = await import('node:fs/promises');
    eventDir = await fs.mkdtemp(
      (await import('node:os')).tmpdir() + '/review-scope-',
    );
    process.env.GITHUB_EVENT_NAME = 'pull_request_target';
    process.env.GITHUB_EVENT_PATH = eventDir + '/event.json';
    await fs.writeFile(
      process.env.GITHUB_EVENT_PATH,
      JSON.stringify({ pull_request: { number: options.eventPr } }),
    );
  }
  const { issueRequirements, scopeMarker } =
    await import('./scripts/delivery/requirements.mjs');
  const { requirementsApproval, requirementsMarker, readyMarker } =
    await import('./scripts/delivery/lib.mjs');
  const sha = 'a'.repeat(40);
  const issue = {
    number: 78,
    title: 'Task',
    body: options.progressEdit
      ? '## Scope\n- [ ] Isolate data\n\n## Evidence dokončení\nPending'
      : 'Scope',
  };
  let status = options.existingHandoff
    ? 'Ready for Testing'
    : 'Ready for Code Review';
  const calls = [];
  const requested = new Map();
  const comments = new Map([[78, []]]);
  const prs = (options.authors ?? ['darebakdavca']).map((author, i) => ({
    number: 12 + i,
    labels: [
      {
        name:
          options.severityByPr?.[12 + i] ??
          (options.unapproved ? 'severity:high' : 'severity:standard'),
      },
    ],
    issue_url: `https://api.github.com/repos/owner/repo/issues/${12 + i}`,
    user: { login: author },
    head: { sha },
    state: 'open',
    base: { ref: options.stacked ? 'feature/prerequisite' : 'main' },
    draft: options.draft ?? false,
    changed_files: 1,
    additions: options.binaryOnly ? 0 : 1,
    deletions: 0,
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
    if (options.freshReview)
      comments.set(
        pr.number,
        comments
          .get(pr.number)
          .filter((c) => !c.body.startsWith('<!-- agent-review-scope')),
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
    if (options.noVerdict) {
      comments.set(
        pr.number,
        comments
          .get(pr.number)
          .filter((c) => !c.body.startsWith('<!-- agent-review-scope')),
      );
    }
    if (options.waiver || options.waiversByPr?.includes(pr.number)) {
      comments.get(pr.number).push({
        id: 100 + pr.number,
        user: { login: options.waiverUser ?? 'darebakdavca', type: 'User' },
        issue_url: pr.issue_url,
        body: `/copilot-waive ${options.waiverSha ?? sha} Human accepts these findings`,
        created_at: '2004-01-01T00:00:00Z',
        updated_at: '2004-01-01T00:00:00Z',
        html_url: `https://github.com/owner/repo/pull/${pr.number}#issuecomment-${100 + pr.number}`,
      });
    }
    requested.set(pr.number, []);
  }
  if (options.progressEdit) {
    issue.body = issue.body
      .replace('[ ]', '[x]')
      .replace('Pending', 'Tests: https://example.test/report');
    issue.updated_at = '2005-01-01T00:00:00Z';
    if (options.qaApproved)
      reviews.push({
        id: 2,
        user: { login: 'MatejKrones' },
        state: 'APPROVED',
        commit_id: sha,
        submitted_at: '2004-01-01T00:00:00Z',
      });
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
    } else if (path.includes('/actions/runs')) {
      if (options.ciUnavailable) throw new Error('CI API unavailable');
      data = { workflow_runs: [] };
    } else if (/\/pulls\/\d+$/.test(path)) {
      if (
        options.freshReview &&
        opts.headers.Accept === 'application/vnd.github.diff'
      ) {
        return {
          ok: true,
          text: async () =>
            options.binaryOnly
              ? 'diff --git a/image.png b/image.png\nBinary files a/image.png and b/image.png differ\n'
              : 'diff --git a/file.ts b/file.ts\nnew file mode 100644\n--- /dev/null\n+++ b/file.ts\n@@ -0,0 +1 @@\n+export const value = 1;\n',
        };
      }
      assert.notEqual(
        opts.headers.Accept,
        'application/vnd.github.diff',
        'cached verdict must avoid Copilot',
      );
      const number = Number(path.split('/').at(-1));
      const count = (headReads.get(number) ?? 0) + 1;
      headReads.set(number, count);
      const pr = prs.find((p) => p.number === number);
      if (options.revokeDuringReview && count === 3) {
        comments.set(
          number,
          comments
            .get(number)
            .filter((c) => !c.body.startsWith('/copilot-waive')),
        );
      }
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
    if (i === 0 && options.replaceAfterFirst) {
      for (const pr of prs) {
        const old = comments
          .get(pr.number)
          .find((c) => c.body.startsWith('/copilot-waive'));
        comments.get(pr.number).push({
          ...old,
          id: old.id + 1000,
          updated_at: new Date(Date.now() + 1000).toISOString(),
        });
      }
    }
    if (i === 1 && options.deleteNewestAfterSecond) {
      for (const pr of prs)
        comments.set(
          pr.number,
          comments
            .get(pr.number)
            .filter(
              (c) => !(c.body.startsWith('/copilot-waive') && c.id > 1000),
            ),
        );
    }
    if (i === 0 && options.revokeAfterFirst) {
      for (const pr of prs)
        comments.set(
          pr.number,
          comments
            .get(pr.number)
            .filter((c) => !c.body.startsWith('/copilot-waive')),
        );
    }
    if (i === 0 && options.editAfterFirst) {
      for (const pr of prs)
        for (const c of comments.get(pr.number)) {
          if (c.body.startsWith('/copilot-waive')) {
            c.body += ' Updated reason';
            c.updated_at = new Date(Date.now() + 1000).toISOString();
          }
        }
    }
  }
  if (eventDir)
    await (await import('node:fs/promises')).rm(eventDir, { recursive: true });
  // A simulated API failure is asserted in the result rather than failing the child.
  process.exitCode = 0;
  console.log(
    JSON.stringify({
      status,
      calls,
      requested: Object.fromEntries(requested),
      prComments: Object.fromEntries(
        prs.map((pr) => [
          pr.number,
          comments.get(pr.number).map((c) => c.body),
        ]),
      ),
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
        GITHUB_EVENT_NAME: 'schedule',
        GITHUB_EVENT_PATH: '',
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

test('owner waiver bypasses cached findings and requests QA with an explicit manual handoff', () => {
  const r = run({
    authors: ['developer'],
    waiver: true,
    verdict: 'findings',
    runs: 2,
  });
  assert.equal(r.status, 'Ready for Testing');
  assert.deepEqual(r.requested, { 12: ['MatejKrones'] });
  assert.deepEqual(r.handoffs, [1]);
  assert.equal(
    r.prComments[12].filter((c) => c.includes('result=pass')).length,
    0,
  );
  assert.ok(r.prComments[12].some((c) => c.includes('result=findings')));
  assert.ok(
    r.prComments[12].some(
      (c) =>
        c.startsWith('<!-- delivery-ready') &&
        c.includes('<!-- copilot-waiver source=') &&
        c.includes('Copilot waived'),
    ),
  );
});

test('owner waiver does not need a model verdict and works for David and Matej PRs', () => {
  const r = run({
    authors: ['darebakdavca', 'MatejKrones'],
    waiver: true,
    noVerdict: true,
  });
  assert.equal(r.status, 'Ready for Testing');
  assert.deepEqual(r.requested, { 12: ['MatejKrones'], 13: ['darebakdavca'] });
  assert.ok(
    Object.values(r.prComments).every(
      (cs) => !cs.some((c) => c.includes('result=pass')),
    ),
  );
});

for (const options of [
  { waiverUser: 'MatejKrones' },
  { waiverSha: 'b'.repeat(40) },
  { draft: true },
  { unapproved: true },
  { pushDuringReview: true },
  { revokeDuringReview: true },
]) {
  test(`waiver does not bypass blocked runner state: ${JSON.stringify(options)}`, () => {
    const r = run({
      authors: ['developer'],
      waiver: true,
      verdict: 'findings',
      ...options,
    });
    assert.deepEqual(r.requested, { 12: [] });
    assert.deepEqual(r.handoffs, [0]);
  });
}

test('a waiver for one PR does not excuse another linked PR with findings', () => {
  const r = run({
    authors: ['darebakdavca', 'MatejKrones'],
    waiversByPr: [12],
    verdict: 'findings',
  });
  assert.deepEqual(r.requested, { 12: [], 13: [] });
  assert.deepEqual(r.handoffs, [0, 0]);
});

test('deleting a waiver returns testing issue to code review rather than using the old handoff', () => {
  const r = run({
    waiver: true,
    verdict: 'findings',
    revokeAfterFirst: true,
    runs: 2,
  });
  assert.equal(r.status, 'Ready for Code Review');
  assert.deepEqual(r.handoffs, [1]);
  assert.equal(r.calls.filter((c) => c === 'request:12').length, 1);
});

test('editing the waiver creates a new auditable handoff without duplicate pending request', () => {
  const r = run({
    waiver: true,
    verdict: 'findings',
    editAfterFirst: true,
    runs: 2,
  });
  assert.equal(r.status, 'Ready for Testing');
  assert.deepEqual(r.handoffs, [2]);
  assert.equal(r.calls.filter((c) => c === 'request:12').length, 1);
});

test('waived dry run writes no fabricated verdict, handoff or request', () => {
  const r = run({ waiver: true, noVerdict: true, dryRun: true });
  assert.equal(
    r.calls.some((c) => /^(request|handoff|status|comment):/.test(c)),
    false,
  );
});

test('real runner persists the latest waiver so deleting it cannot resurrect the earlier command', () => {
  const r = run({
    waiver: true,
    verdict: 'findings',
    replaceAfterFirst: true,
    deleteNewestAfterSecond: true,
    runs: 3,
  });
  assert.equal(r.status, 'Ready for Code Review');
  assert.deepEqual(r.handoffs, [2]);
  assert.equal(
    r.prComments[12].filter((c) => c.startsWith('<!-- copilot-waiver-observed'))
      .length,
    2,
  );
  assert.equal(r.calls.filter((c) => c === 'request:12').length, 1);
});

test('progress-only issue edits reuse agent review and handoff across repeated events', () => {
  const r = run({
    authors: ['developer'],
    progressEdit: true,
    existingHandoff: true,
    runs: 2,
  });
  assert.equal(r.status, 'Ready for Testing');
  assert.deepEqual(r.handoffs, [1]);
  assert.equal(r.calls.filter((c) => c === 'request:12').length, 1);
  assert.equal(
    r.calls.some((c) => c === 'comment:12'),
    false,
  );
});
test('progress edits after QA preserve approval without duplicate requests or handoff', () => {
  const r = run({
    authors: ['developer'],
    progressEdit: true,
    qaApproved: true,
    existingHandoff: true,
    runs: 2,
  });
  assert.equal(r.status, 'Ready for Testing');
  assert.deepEqual(r.handoffs, [1]);
  assert.deepEqual(r.requested, { 12: [] });
  assert.equal(
    r.calls.some((c) => c === 'comment:12'),
    false,
  );
});

test('stacked PR waits without review, QA handoff or runner failure', () => {
  const r = run({ stacked: true });
  assert.deepEqual(r.handoffs, [0]);
  assert.deepEqual(r.requested, { 12: [] });
  assert.equal(r.status, 'Ready for Code Review');
  assert.ok(r.calls.includes('exit:0'));
});

test('PR event does not review unrelated board issues', () => {
  const r = run({ eventPr: 144 });
  assert.deepEqual(r.handoffs, [0]);
  assert.deepEqual(r.requested, { 12: [] });
  assert.deepEqual(r.calls, ['exit:0']);
});

test('PR event reviews its linked board issue', () => {
  const r = run({ eventPr: 12 });
  assert.deepEqual(r.handoffs, [1]);
  assert.deepEqual(r.requested, { 12: ['MatejKrones'] });
  assert.ok(r.calls.includes('exit:0'));
});

test('fresh review waits for CI without a model verdict or QA handoff', () => {
  const r = run({ freshReview: true });
  assert.deepEqual(r.handoffs, [0]);
  assert.ok(r.calls.includes('exit:0'));
  assert.ok(
    !r.prComments[12].some(
      (c) => c.includes('result=pass') || c.includes('result=error'),
    ),
  );
});

test('CI API errors never run the already-planned review or produce a pass', () => {
  const r = run({ freshReview: true, ciUnavailable: true });
  assert.deepEqual(r.handoffs, [0]);
  assert.ok(
    r.prComments[12].some(
      (c) => c.includes('result=error') && c.includes('CI API unavailable'),
    ),
  );
  assert.ok(!r.prComments[12].some((c) => c.includes('result=pass')));
});

test('binary-only PR reaches QA with explicit skipped coverage and no Copilot call', () => {
  const r = run({ freshReview: true, binaryOnly: true });
  assert.deepEqual(r.handoffs, [1]);
  assert.deepEqual(r.requested, { 12: ['MatejKrones'] });
  assert.ok(
    r.prComments[12].some(
      (c) =>
        c.includes('Text review: no text changes') &&
        c.includes('Copilot not called') &&
        c.includes('image.png'),
    ),
  );
});

test('Low PRs linked to an issue skip both review and QA handoff', () => {
  const r = run({ severityByPr: { 12: 'severity:low' } });
  assert.equal(
    r.calls.some((c) => c.startsWith('request:') || c.startsWith('handoff:')),
    false,
  );
  assert.deepEqual(r.handoffs, [0]);
});
test('mixed Low and Standard linked PRs hand only Standard to QA', () => {
  const r = run({
    authors: ['developer', 'MatejKrones'],
    severityByPr: { 12: 'severity:low' },
  });
  assert.equal(r.status, 'Ready for Testing');
  assert.deepEqual(r.requested, { 12: [], 13: ['darebakdavca'] });
  assert.deepEqual(r.handoffs, [0, 1]);
});
