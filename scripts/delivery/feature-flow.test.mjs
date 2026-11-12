import test from 'node:test';
import { execFileSync } from 'node:child_process';

// Top to bottom: the real agent-review runner and delivery checker against one
// in-memory GitHub holding a feature: parent issue #400 linking
// integration/400-rooms, sub-issues #401 (frontend, child PR #41) and #402
// (backend, already done), and the parent PR #50 from the branch into main.
// Copilot is never called: the child's pass is seeded, and the parent's review
// carries over from it.
async function flow() {
  const assert = (await import('node:assert/strict')).default;
  const { setTimeout: sleep } = await import('node:timers/promises');

  const BRANCH = 'integration/400-rooms';
  const repository = { full_name: 'owner/repo' };
  const nameWithOwner = 'owner/repo';
  const childSha = 'a'.repeat(40);
  const mergeSha = 'b'.repeat(40);
  const parentSha = 'c'.repeat(40);
  const board = new Map([
    [400, 'In Progress'],
    [401, 'In Progress'],
  ]);
  const issues = new Map([
    [400, { number: 400, title: 'Rooms', body: 'Feature', state: 'OPEN' }],
    [401, { number: 401, title: 'Rooms UI', body: 'FE', state: 'OPEN' }],
  ]);
  const subs = new Map([
    [401, { state: 'OPEN', stateReason: null, label: 'area:frontend' }],
    [402, { state: 'CLOSED', stateReason: 'COMPLETED', label: 'area:backend' }],
  ]);
  const child = {
    number: 41,
    state: 'open',
    draft: false,
    title: 'Rooms UI',
    body: 'Closes #401',
    labels: [{ name: 'severity:standard' }],
    user: { login: 'developer' },
    base: { ref: BRANCH, repo: repository },
    head: { ref: 'feat/401-rooms-ui', sha: childSha, repo: repository },
    issue_url: 'https://api.github.com/repos/owner/repo/issues/41',
    changed_files: 1,
    additions: 1,
    deletions: 0,
  };
  const parent = {
    number: 50,
    state: 'open',
    draft: false,
    title: 'Rooms',
    body: 'Closes #400',
    labels: [{ name: 'severity:standard' }],
    user: { login: 'developer' },
    base: { ref: 'main', repo: repository },
    head: { ref: BRANCH, sha: parentSha, repo: repository },
    issue_url: 'https://api.github.com/repos/owner/repo/issues/50',
    changed_files: 1,
    additions: 1,
    deletions: 0,
  };
  const prs = [child, parent];
  const byNumber = (n) => prs.find((p) => p.number === n);
  const bot = (body, at = new Date().toISOString()) => ({
    id: Math.floor(Math.random() * 1e9),
    user: { login: 'github-actions[bot]' },
    body,
    created_at: at,
    html_url: 'https://example.test/comment',
  });
  const comments = new Map([
    [400, []],
    [401, []],
    // The child already passed review on its current commit.
    [
      41,
      [
        bot(
          `<!-- agent-review-scope issue=401 -->\n<!-- agent-review pr=41 sha=${childSha} result=pass attempt=1 -->\nok`,
          '2002-01-01T00:00:00Z',
        ),
      ],
    ],
    [50, []],
  ]);
  const reviews = new Map([
    [41, []],
    [50, []],
  ]);
  const requested = new Map([
    [41, []],
    [50, []],
  ]);
  const statuses = new Map();
  let reopenDuringReview = false;
  const conn = (nodes) => ({ nodes, pageInfo: { hasNextPage: false } });
  const branchLink = conn([
    { ref: { name: BRANCH, repository: { nameWithOwner } } },
  ]);
  const details = (number) =>
    number === 400
      ? {
          number: 400,
          state: 'OPEN',
          labels: conn([]),
          linkedBranches: branchLink,
          parent: null,
          subIssues: conn(
            [...subs].map(([n, s]) => ({
              number: n,
              state: s.state,
              stateReason: s.stateReason,
              labels: conn([{ name: s.label }]),
            })),
          ),
        }
      : {
          number,
          state: subs.get(number).state,
          labels: conn([{ name: subs.get(number).label }]),
          linkedBranches: conn([]),
          parent: {
            number: 400,
            state: 'OPEN',
            repository: { nameWithOwner },
            linkedBranches: branchLink,
          },
          subIssues: conn([]),
        };
  const crossReference = (pr, issue) => ({
    __typename: 'CrossReferencedEvent',
    source: {
      __typename: 'PullRequest',
      number: pr.number,
      state: pr.state.toUpperCase(),
      body: pr.body,
      baseRefName: pr.base.ref,
      repository: { nameWithOwner },
    },
    target: {
      __typename: 'Issue',
      number: issue,
      repository: { nameWithOwner },
    },
  });
  const item = (number) => ({
    id: `item-${number}`,
    status: { name: board.get(number) },
    content: {
      ...issues.get(number),
      repository: { nameWithOwner },
      // GitHub links closing keywords natively only for PRs into main.
      closedByPullRequestsReferences: conn(
        number === 400 && parent.state === 'open'
          ? [{ number: 50, state: 'OPEN', repository: { nameWithOwner } }]
          : [],
      ),
      timelineItems: conn(number === 401 ? [crossReference(child, 401)] : []),
    },
  });

  globalThis.fetch = async (url, opts = {}) => {
    const { pathname: path, searchParams } = new URL(url);
    const body = opts.body ? JSON.parse(opts.body) : {};
    let data;
    if (path === '/graphql') {
      const q = body.query;
      if (q.includes('organization(login:'))
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
                    'Done',
                  ].map((name) => ({ id: name, name })),
                },
                items: {
                  pageInfo: { hasNextPage: false },
                  nodes: [...issues.values()]
                    .filter((i) => i.state === 'OPEN')
                    .map((i) => item(i.number)),
                },
              },
            },
          },
        };
      else if (q.includes('updateProjectV2ItemFieldValue')) {
        board.set(
          Number(body.variables.item.split('-')[1]),
          body.variables.option,
        );
        data = {
          data: {
            updateProjectV2ItemFieldValue: {
              projectV2Item: { id: body.variables.item },
            },
          },
        };
      } else if (q.includes('closingIssuesReferences'))
        data = {
          data: {
            repository: {
              pullRequest: {
                closingIssuesReferences: conn(
                  body.variables.number === 50
                    ? [{ number: 400, repository: { nameWithOwner } }]
                    : [],
                ),
              },
            },
          },
        };
      else if (q.includes('linkedBranches'))
        data = {
          data: { repository: { issue: details(body.variables.number) } },
        };
      else
        data = {
          data: {
            node: {
              status: {
                name: board.get(Number(body.variables.id.split('-')[1])),
              },
            },
          },
        };
    } else if (path.includes('/compare/')) {
      const [from, to] = decodeURIComponent(path.split('/compare/')[1]).split(
        '...',
      );
      // The branch started at parentSha on main; the child merge is above it.
      data =
        to === 'main'
          ? { status: from === parentSha ? 'ahead' : 'diverged' }
          : { status: from === to ? 'identical' : 'ahead' };
    } else if (path.endsWith('/timeline')) data = [];
    else if (
      path === `/repos/owner/repo/rules/branches/${encodeURIComponent(BRANCH)}`
    )
      // The installed integration branch ruleset.
      data = [
        { type: 'deletion' },
        { type: 'non_fast_forward' },
        { type: 'pull_request' },
        {
          type: 'required_status_checks',
          parameters: {
            required_status_checks: ['child-verify', 'Delivery stages'].map(
              (context) => ({
                context,
                integration_id: 15368,
              }),
            ),
          },
        },
      ];
    else if (/\/issues\/\d+$/.test(path)) {
      const number = Number(path.split('/').at(-1));
      if (opts.method === 'PATCH') {
        Object.assign(subs.get(number), {
          state: body.state.toUpperCase(),
          stateReason: body.state_reason.toUpperCase(),
        });
        issues.get(number).state = body.state.toUpperCase();
      }
      data = issues.get(number);
    } else if (path.endsWith('/comments')) {
      const number = Number(path.split('/').at(-2));
      if (opts.method === 'POST') {
        data = bot(body.body);
        comments.get(number).push(data);
        // A sub-issue reopened while the parent is being reviewed.
        if (
          reopenDuringReview &&
          number === 50 &&
          body.body.includes('převzato')
        )
          Object.assign(subs.get(402), {
            state: 'OPEN',
            stateReason: 'REOPENED',
          });
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
    } else if (path.endsWith(`/commits/${mergeSha}`))
      data = { parents: [{ sha: parentSha }, { sha: childSha }] };
    else if (path.endsWith('/files'))
      data = [{ filename: 'apps/frontend/src/features/rooms/RoomList.tsx' }];
    else if (path.startsWith('/repos/owner/repo/statuses/')) {
      statuses.set(`${path.split('/').at(-1)}|${body.context}`, body);
      data = {};
    } else if (path.includes('/check-runs')) data = { check_runs: [] };
    else if (path.endsWith(`/commits/${childSha}/pulls`))
      data = prs.filter((p) => p.head.sha === childSha);
    else if (path.endsWith('/actions/runs'))
      data = {
        workflow_runs: [
          {
            id: 7,
            run_attempt: 1,
            head_sha: childSha,
            head_branch: child.head.ref,
            path: '.github/workflows/ci.yml',
            repository,
            head_repository: repository,
            created_at: '2003-01-01T00:00:00Z',
            status: 'completed',
            conclusion: 'failure',
            html_url: 'https://example.test/run',
            pull_requests: [{ number: 41, base: { ref: BRANCH } }],
          },
        ].filter((run) => run.head_sha === searchParams.get('head_sha')),
      };
    else if (path.endsWith('/actions/runs/7/jobs'))
      data = {
        jobs: ['checks', 'stories', 'database', 'e2e', 'verify'].map(
          (name) => ({
            name,
            head_sha: childSha,
            status: 'completed',
            conclusion: ['checks', 'stories'].includes(name)
              ? 'success'
              : name === 'database'
                ? 'success'
                : 'skipped',
            steps: [],
          }),
        ),
      };
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
        throw new Error('The diff must not be read: no review should run here');
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
  async function deliver() {
    process.exitCode = 0;
    await import(`./scripts/delivery/run.mjs?flow=${run++}`);
    assert.equal(process.exitCode ?? 0, 0, 'delivery check errored');
    await sleep(5);
  }
  const status = (pr, context = 'Delivery stages') =>
    statuses.get(`${byNumber(pr).head.sha}|${context}`);
  const note = (issue, text) =>
    comments.get(issue).some((c) => c.body.includes(text));

  // 1. The child is reviewed without a QA handoff; its sub-issue waits in code
  //    review. The parent stays In Progress and is not reviewed yet.
  await review();
  assert.equal(board.get(401), 'Ready for Code Review');
  assert.equal(board.get(400), 'In Progress');
  assert.deepEqual(requested.get(41), []);
  assert.ok(!comments.get(41).some((c) => c.body.includes('delivery-ready')));
  assert.ok(note(400, 'The parent PR is not reviewed or handed to QA yet'));
  assert.ok(
    !comments.get(50).some((c) => c.body.includes('agent-review pr=50')),
  );

  // 2. Delivery passes the child on its agent review and lanes alone.
  await deliver();
  assert.equal(status(41).state, 'success', status(41).description);
  assert.equal(status(41, 'child-verify').state, 'success');
  assert.equal(status(50).state, 'failure');
  assert.match(status(50).description, /#401 of #400 are still open/);

  // 3. The child merges into the branch, which now ends in its merge commit,
  //    and the Integration merge workflow closes its sub-issue.
  Object.assign(child, {
    state: 'closed',
    merged_at: new Date().toISOString(),
    merge_commit_sha: mergeSha,
  });
  parent.head.sha = mergeSha;
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = await mkdtemp(join(tmpdir(), 'feature-flow-'));
  process.env.GITHUB_EVENT_PATH = join(dir, 'event.json');
  await writeFile(
    process.env.GITHUB_EVENT_PATH,
    JSON.stringify({ pull_request: { number: 41 } }),
  );
  await import(`./scripts/delivery/close-child.mjs?flow=${run++}`);
  await sleep(5);
  process.env.GITHUB_EVENT_PATH = '';
  await rm(dir, { recursive: true, force: true });
  assert.deepEqual(subs.get(401), {
    state: 'CLOSED',
    stateReason: 'COMPLETED',
    label: 'area:frontend',
  });

  // 4. A sub-issue reopened while the parent is reviewed: no QA handoff.
  reopenDuringReview = true;
  await review();
  reopenDuringReview = false;
  assert.equal(board.get(400), 'In Progress');
  assert.deepEqual(requested.get(50), []);
  assert.ok(!comments.get(50).some((c) => c.body.includes('delivery-ready')));
  Object.assign(subs.get(402), { state: 'CLOSED', stateReason: 'COMPLETED' });

  // 5. The parent is eligible: its review carried over from the child, and it
  //    is handed to QA like any other PR.
  await review();
  assert.equal(board.get(400), 'Ready for Testing');
  assert.ok(
    comments
      .get(50)
      .some(
        (c) =>
          c.body.includes('převzato z integrační větve') &&
          c.body.includes('#41'),
      ),
  );
  assert.deepEqual(requested.get(50), ['MatejKrones']);
  await deliver();
  assert.match(status(50).description, /QA approval by MatejKrones is missing/);

  // 6. QA approves the parent commit: only now can the feature reach main.
  reviews.get(50).push({
    id: 1,
    user: { login: 'MatejKrones' },
    state: 'APPROVED',
    commit_id: mergeSha,
    submitted_at: new Date().toISOString(),
  });
  await sleep(5);
  await deliver();
  assert.equal(status(50).state, 'success', status(50).description);
  console.log(JSON.stringify({ ok: true }));
  process.exitCode = 0;
}

test('a feature goes from a reviewed child PR to one QA approval of its parent PR', () => {
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
