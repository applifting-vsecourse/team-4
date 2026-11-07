import test from 'node:test';
import { execFileSync } from 'node:child_process';

// Top to bottom: the real agent-review runner and the real delivery checker run
// against ONE in-memory GitHub holding a six-PR stack shaped like S3-01. Copilot
// is never called: passes are seeded, or carried over from an earlier commit.
async function flow() {
  const assert = (await import('node:assert/strict')).default;
  const { mkdtemp, rm, writeFile } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { setTimeout: sleep } = await import('node:timers/promises');
  const { prMarker } = await import('./scripts/agent-review/lib.mjs');
  const { sliceFingerprint } = await import('./scripts/delivery/stack.mjs');
  const { issueRequirements, scopeMarker } =
    await import('./scripts/delivery/requirements.mjs');
  const { requirementsApproval, requirementsMarker } =
    await import('./scripts/delivery/lib.mjs');

  const diffText =
    'diff --git a/file.ts b/file.ts\nnew file mode 100644\n--- /dev/null\n+++ b/file.ts\n@@ -0,0 +1 @@\n+export const value = 1;\n';
  const issue = { number: 78, title: 'S3-01', body: 'Scope' };
  let boardStatus = 'Ready for Code Review';
  let nextSha = 1;
  const newSha = () => (nextSha++).toString(16).padStart(40, 'a');
  const NUMBERS = [12, 13, 14, 15, 16, 17];
  const tipNumber = 17;

  // The "git history": which commits each head contains.
  const contains = new Map();
  let previousSha = null;
  const prs = NUMBERS.map((number, i) => {
    const sha = newSha();
    contains.set(
      sha,
      new Set([...(previousSha ? contains.get(previousSha) : []), sha]),
    );
    previousSha = sha;
    return {
      number,
      state: 'open',
      draft: false,
      title: `slice ${i + 1}`,
      body: number === tipNumber ? 'Closes #78' : 'Refs #78',
      labels: [{ name: 'severity:standard' }],
      user: { login: 'developer' },
      head: { ref: `branch-${number}`, sha },
      base: { ref: i ? `branch-${NUMBERS[i - 1]}` : 'main' },
      changed_files: 1,
      additions: 1,
      deletions: 0,
    };
  });
  const byNumber = (n) => prs.find((p) => p.number === n);
  const comments = new Map([[78, []]]);
  const reviews = new Map();
  const requested = new Map();
  const statuses = new Map(); // head sha -> latest Delivery stages state
  const bot = (body, at = new Date().toISOString()) => ({
    id: Math.floor(Math.random() * 1e9),
    user: { login: 'github-actions[bot]' },
    body,
    created_at: at,
    html_url: 'https://example.test/comment',
  });

  // Requirements: Standard severity records a policy skip, as in production.
  const snapshots = prs.map((pr) => ({ pr, reviews: [] }));
  const scope = issueRequirements(issue, comments.get(78), snapshots);
  for (const pr of prs) {
    pr.requirements = scope.approval;
    pr.requirementsVersion = scope.version;
    reviews.set(pr.number, []);
    requested.set(pr.number, []);
    const approval = requirementsApproval(pr, []);
    // Each slice already passed review on its first commit.
    comments.set(pr.number, [
      bot(
        requirementsMarker(pr.number, pr.head.sha, 78, approval.id) + '\n',
        '2001-01-01T00:00:00Z',
      ),
      bot(
        '<!-- agent-review-scope issue=78 -->\n' +
          prMarker({
            pr: pr.number,
            sha: pr.head.sha,
            result: 'pass',
            attempt: 1,
            slice: sliceFingerprint(diffText),
          }),
        '2002-01-01T00:00:00Z',
      ),
    ]);
  }
  void scopeMarker;

  const statusOf = (compareFrom, compareTo) =>
    compareFrom === compareTo
      ? 'identical'
      : contains.get(compareTo)?.has(compareFrom)
        ? 'ahead'
        : 'diverged';

  globalThis.fetch = async (url, opts = {}) => {
    const { pathname: path, searchParams } = new URL(url);
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
                      status: { name: boardStatus },
                      content: {
                        ...issue,
                        state: 'OPEN',
                        repository: { nameWithOwner: 'owner/repo' },
                        closedByPullRequestsReferences: {
                          pageInfo: { hasNextPage: false },
                          nodes: [],
                        },
                        timelineItems: {
                          pageInfo: { hasNextPage: false },
                          nodes: prs.map((pr) => ({
                            __typename: 'CrossReferencedEvent',
                            source: {
                              __typename: 'PullRequest',
                              number: pr.number,
                              state: pr.state.toUpperCase(),
                              body: pr.body,
                              baseRefName: pr.base.ref,
                              repository: { nameWithOwner: 'owner/repo' },
                            },
                            target: {
                              __typename: 'Issue',
                              number: 78,
                              repository: { nameWithOwner: 'owner/repo' },
                            },
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
        boardStatus = body.variables.option;
        data = {
          data: {
            updateProjectV2ItemFieldValue: { projectV2Item: { id: 'item' } },
          },
        };
      } else if (body.query.includes('closingIssuesReferences'))
        data = {
          data: {
            repository: {
              pullRequest: {
                closingIssuesReferences: {
                  nodes: [],
                  pageInfo: { hasNextPage: false },
                },
              },
            },
          },
        };
      else data = { data: { node: { status: { name: boardStatus } } } };
    } else if (path.includes('/compare/')) {
      const [from, to] = path.split('/compare/')[1].split('...');
      data = { status: statusOf(from, to) };
    } else if (path.endsWith('/timeline')) data = [];
    else if (path.endsWith('/issues/78')) data = issue;
    else if (path.endsWith('/comments')) {
      const number = Number(path.split('/').at(-2));
      if (opts.method === 'POST') {
        data = bot(body.body);
        comments.get(number).push(data);
      } else data = comments.get(number);
    } else if (path.endsWith('/reviews'))
      data = reviews.get(Number(path.split('/').at(-2)));
    else if (path.endsWith('/requested_reviewers')) {
      const number = Number(path.split('/').at(-2));
      if (opts.method === 'POST') requested.get(number).push(...body.reviewers);
      data = {
        users: requested.get(number).map((login) => ({ login })),
        teams: [],
      };
    } else if (path.endsWith('/files'))
      data = [{ filename: 'apps/backend/src/example.ts' }];
    else if (path.startsWith('/repos/owner/repo/statuses/')) {
      statuses.set(path.split('/').at(-1), body);
      data = {};
    } else if (path.includes('/check-runs')) data = { check_runs: [] };
    else if (path.includes('/actions/runs')) data = { workflow_runs: [] };
    else if (path === '/repos/owner/repo/pulls') {
      const head = searchParams.get('head')?.split(':')[1];
      const base = searchParams.get('base');
      const state = searchParams.get('state') ?? 'open';
      data = prs.filter(
        (p) =>
          p.state === state &&
          (!head || p.head.ref === head) &&
          (!base || p.base.ref === base),
      );
    } else if (/\/pulls\/\d+$/.test(path)) {
      if (opts.headers?.Accept === 'application/vnd.github.diff')
        return { ok: true, text: async () => diffText };
      data = byNumber(Number(path.split('/').at(-1)));
    } else throw new Error('Unexpected API: ' + path);
    return { ok: true, json: async () => structuredClone(data) };
  };

  let run = 0;
  async function review() {
    process.exitCode = 0;
    await import(`./scripts/agent-review/run.mjs?flow=${run++}`);
    assert.equal(process.exitCode ?? 0, 0, 'agent-review failed');
    await sleep(5);
  }
  async function deliver(eventName, number) {
    const dir = await mkdtemp(join(tmpdir(), 'stack-flow-'));
    try {
      if (eventName) {
        process.env.GITHUB_EVENT_NAME = eventName;
        process.env.GITHUB_EVENT_PATH = join(dir, 'event.json');
        await writeFile(
          process.env.GITHUB_EVENT_PATH,
          JSON.stringify({ pull_request: { number } }),
        );
      }
      process.exitCode = 0;
      await import(`./scripts/delivery/run.mjs?flow=${run++}`);
    } finally {
      process.env.GITHUB_EVENT_NAME = 'schedule';
      process.env.GITHUB_EVENT_PATH = '';
      await rm(dir, { recursive: true, force: true });
    }
    assert.equal(process.exitCode ?? 0, 0, 'delivery check errored');
    await sleep(5);
    return Object.fromEntries(
      prs.map((pr) => [pr.number, statuses.get(pr.head.sha)]),
    );
  }
  const tip = () => byNumber(tipNumber);
  const passing = (all) =>
    Object.entries(all)
      .filter(([, s]) => s?.state === 'success')
      .map(([n]) => Number(n));

  // 1. Review: the whole stack is reviewed and handed to QA, once, at the tip.
  await review();
  assert.equal(boardStatus, 'Ready for Testing');
  assert.deepEqual(requested.get(tipNumber), ['MatejKrones']);
  for (const n of NUMBERS.slice(0, -1)) assert.deepEqual(requested.get(n), []);

  // 2. Delivery before QA: nobody passes; lower PRs point at the tip.
  let result = await deliver();
  assert.deepEqual(passing(result), []);
  assert.match(result[12].description, /stack tip #17/);
  assert.match(result[17].description, /QA approval by MatejKrones is missing/);

  // 3. One QA approval of the tip commit covers all six PRs.
  reviews.get(tipNumber).push({
    id: 1,
    user: { login: 'MatejKrones' },
    state: 'APPROVED',
    commit_id: tip().head.sha,
    submitted_at: new Date().toISOString(),
  });
  await sleep(5);
  result = await deliver('pull_request_review', tipNumber);
  assert.deepEqual(passing(result), NUMBERS);

  // A dismissed approval invalidates every lower head even though none moved.
  reviews.get(tipNumber)[0].state = 'DISMISSED';
  result = await deliver('pull_request_review', tipNumber);
  assert.deepEqual(passing(result), []);
  reviews.get(tipNumber)[0].state = 'APPROVED';
  result = await deliver('pull_request_review', tipNumber);
  assert.deepEqual(passing(result), NUMBERS);

  // 4. The parent of #15 gets a merge from main, then every branch above it
  //    merges its parent, so each head changes while no PR's own change does.
  const idx = (n) => NUMBERS.indexOf(n);
  for (const n of NUMBERS.slice(idx(14))) {
    const pr = byNumber(n);
    const sha = newSha();
    contains.set(
      sha,
      new Set([
        ...contains.get(pr.head.sha),
        ...(n === 14
          ? []
          : contains.get(byNumber(NUMBERS[idx(n) - 1]).head.sha)),
        sha,
      ]),
    );
    pr.head.sha = sha;
  }
  // Delivery sees new heads with no QA yet: the old tip approval is stale.
  result = await deliver('pull_request_target', tipNumber);
  assert.deepEqual(passing(result), []);

  // 5. Review again: the passes carry over (Copilot is not installed here, so
  //    a real review would error) and QA is asked once more at the new tip.
  requested.get(tipNumber).length = 0;
  await review();
  assert.equal(boardStatus, 'Ready for Testing');
  for (const n of NUMBERS.slice(idx(14)))
    assert.ok(
      comments.get(n).some((c) => c.body.includes('převzato')),
      `#${n} should carry its review over`,
    );
  assert.deepEqual(requested.get(tipNumber), ['MatejKrones']);

  // 6. QA approves the new tip commit; the whole stack passes again.
  reviews.get(tipNumber).push({
    id: 2,
    user: { login: 'MatejKrones' },
    state: 'APPROVED',
    commit_id: tip().head.sha,
    submitted_at: new Date().toISOString(),
  });
  await sleep(5);
  result = await deliver();
  assert.deepEqual(passing(result), NUMBERS);

  // 7. A new commit on #14 that the tip does not contain: the tip approval no
  //    longer covers #14, so it and everything below cannot pass.
  const edited = byNumber(14);
  const editedSha = newSha();
  contains.set(
    editedSha,
    new Set([...contains.get(edited.head.sha), editedSha]),
  );
  edited.head.sha = editedSha;
  result = await deliver('pull_request_target', edited.number);
  assert.ok(
    !passing(result).some((n) => n <= 15),
    'tip does not contain the edited commit yet',
  );
  // 8. The author brings the branches above #14 up to date, review carries
  //    over, QA approves the new tip, and /merge-stack merges #12 before it is
  //    interrupted. The rest still targets #12's branch but must stay green, or
  //    a second command could never continue.
  for (const n of NUMBERS.slice(idx(15))) {
    const member = byNumber(n);
    const sha = newSha();
    contains.set(
      sha,
      new Set([
        ...contains.get(member.head.sha),
        ...contains.get(byNumber(NUMBERS[idx(n) - 1]).head.sha),
        sha,
      ]),
    );
    member.head.sha = sha;
  }
  requested.get(tipNumber).length = 0;
  await review();
  reviews.get(tipNumber).push({
    id: 3,
    user: { login: 'MatejKrones' },
    state: 'APPROVED',
    commit_id: tip().head.sha,
    submitted_at: new Date().toISOString(),
  });
  await sleep(5);
  result = await deliver();
  assert.deepEqual(passing(result), NUMBERS);
  const bottom = byNumber(12);
  bottom.state = 'closed';
  bottom.merged_at = new Date().toISOString();
  result = await deliver();
  assert.deepEqual(
    passing(result).filter((n) => n > 12),
    [13, 14, 15, 16, 17],
    'the rest of a half-merged stack must not be reported as waiting',
  );
  console.log(JSON.stringify({ ok: true }));
  process.exitCode = 0;
}

test('a six-PR stack goes from review to a single QA approval and survives a parent merge', () => {
  const out = execFileSync(
    process.execPath,
    ['--input-type=module', '-e', `await (${flow.toString()})()`],
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
        DRY_RUN: 'false',
        FORCE: 'false',
        ONLY_ISSUE: '',
        GITHUB_RUN_ID: '',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );
  if (!out.includes('"ok":true')) throw new Error(out);
});
