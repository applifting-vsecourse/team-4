import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// The real delivery publisher against an in-memory GitHub holding a parent
// issue #400 (linking integration/400-rooms) with sub-issues #401 (frontend)
// and #402 (backend), a child PR #41 for #401 and, in parent modes, the parent
// PR #50 from the integration branch into main.
async function scenario(mode) {
  const BRANCH = 'integration/400-rooms';
  // GitHub can link a same-named branch from another repository.
  const branchRepo = mode === 'foreign-branch' ? 'other/repo' : 'owner/repo';
  const repository = { full_name: 'owner/repo' };
  const sha = 'c'.repeat(40);
  const child = {
    number: 41,
    state: 'open',
    draft: false,
    body: 'Closes #401',
    // Enforcement paths need High; the integration branch must still refuse them.
    labels: [
      { name: mode === 'enforcement' ? 'severity:high' : 'severity:standard' },
    ],
    user: { login: 'developer' },
    base: { ref: BRANCH, repo: repository },
    head: { ref: 'feat/401-rooms-ui', sha, repo: repository },
    changed_files: 1,
  };
  const parent = {
    number: 50,
    state: 'open',
    draft: false,
    body: 'Closes #400',
    labels: [{ name: 'severity:standard' }],
    user: { login: 'developer' },
    base: { ref: 'main', repo: repository },
    head: { ref: BRANCH, sha: 'e'.repeat(40), repo: repository },
    changed_files: 1,
  };
  const parentMode = mode.startsWith('parent');
  const open = parentMode
    ? mode === 'parent-child-open'
      ? [child, parent]
      : [parent]
    : [child];
  const subState = mode === 'parent-sub-open' ? 'OPEN' : 'CLOSED';
  const issue = (number) =>
    ({
      400: {
        number: 400,
        state: 'OPEN',
        labels: { nodes: [], pageInfo: { hasNextPage: false } },
        linkedBranches: {
          nodes: [
            {
              ref: { name: BRANCH, repository: { nameWithOwner: branchRepo } },
            },
          ],
          pageInfo: { hasNextPage: false },
        },
        parent: null,
        subIssues: {
          nodes: [
            [401, 'area:frontend', subState],
            [402, 'area:backend', 'CLOSED'],
          ].map(([n, label, state]) => ({
            number: n,
            state,
            stateReason: 'COMPLETED',
            labels: {
              nodes: [{ name: label }],
              pageInfo: { hasNextPage: false },
            },
          })),
          pageInfo: { hasNextPage: false },
        },
      },
      401: {
        number: 401,
        state: 'OPEN',
        labels: {
          nodes: mode === 'no-area' ? [] : [{ name: 'area:frontend' }],
          pageInfo: { hasNextPage: false },
        },
        linkedBranches: { nodes: [], pageInfo: { hasNextPage: false } },
        parent: {
          number: 400,
          state: 'OPEN',
          repository: { nameWithOwner: 'owner/repo' },
          linkedBranches: {
            nodes: [
              {
                ref: {
                  name: BRANCH,
                  repository: { nameWithOwner: branchRepo },
                },
              },
            ],
            pageInfo: { hasNextPage: false },
          },
        },
        subIssues: { nodes: [], pageInfo: { hasNextPage: false } },
      },
    })[number];
  const verdict = {
    id: 1,
    user: { login: 'github-actions[bot]' },
    created_at: '2002-01-01T00:00:00Z',
    body: `<!-- agent-review-scope issue=401 -->\n<!-- agent-review pr=41 sha=${sha} result=pass attempt=1 -->\n`,
  };
  const lanes = {
    checks: 'success',
    database: 'skipped',
    stories: mode === 'ci-fail' ? 'failure' : 'success',
    e2e: 'skipped',
    verify: 'failure',
  };
  const statuses = [];
  let commitReads = 0;
  globalThis.fetch = async (url, options = {}) => {
    const { pathname: path, searchParams } = new URL(url);
    const body = options.body ? JSON.parse(options.body) : {};
    let data;
    if (path === '/graphql') {
      if (body.query.includes('closingIssuesReferences'))
        data = {
          data: {
            repository: {
              pullRequest: {
                // GitHub links closing keywords natively only into main.
                closingIssuesReferences: {
                  nodes:
                    body.variables.number === 50
                      ? [
                          {
                            number: 400,
                            repository: { nameWithOwner: 'owner/repo' },
                          },
                        ]
                      : [],
                  pageInfo: { hasNextPage: false },
                },
              },
            },
          },
        };
      else
        data = {
          data: { repository: { issue: issue(body.variables.number) } },
        };
    } else if (path === '/repos/owner/repo/pulls')
      data =
        searchParams.get('base') === BRANCH
          ? open.filter((p) => p.base.ref === BRANCH)
          : searchParams.get('head')
            ? mode === 'shared-branch' &&
              searchParams.get('head') === `owner:${child.head.ref}`
              ? [child, { ...child, number: 60, base: { ref: 'main' } }]
              : []
            : searchParams.get('base')
              ? []
              : open;
    else if (/\/pulls\/\d+$/.test(path)) {
      const number = Number(path.split('/').at(-1));
      const found = number === 41 ? child : parent;
      data =
        mode === 'push' && number === 41
          ? { ...found, head: { ...found.head, sha: 'd'.repeat(40) } }
          : found;
    } else if (path.endsWith('/files'))
      data = [
        {
          filename:
            mode === 'enforcement'
              ? 'scripts/delivery/run.mjs'
              : 'apps/frontend/src/features/rooms/RoomList.tsx',
        },
      ];
    else if (/\/issues\/\d+$/.test(path)) {
      const number = Number(path.split('/').at(-1));
      data = { number, title: `Issue ${number}`, body: 'Scope' };
    } else if (path.endsWith('/comments'))
      data =
        path.includes('/issues/41/') && mode !== 'no-review' ? [verdict] : [];
    else if (path.endsWith('/issues/41/timeline'))
      // Retargeted after the only CI run: that run tested another base.
      data =
        mode === 'retargeted'
          ? [{ event: 'base_ref_changed', created_at: '2004-01-01T00:00:00Z' }]
          : [];
    else if (path.endsWith('/reviews') || path.endsWith('/timeline')) data = [];
    else if (path.endsWith('/actions/runs'))
      data = {
        workflow_runs:
          mode === 'no-ci'
            ? []
            : [
                {
                  id: 7,
                  run_attempt: 1,
                  head_sha: sha,
                  head_branch: child.head.ref,
                  path: '.github/workflows/ci.yml',
                  repository,
                  head_repository: repository,
                  created_at: '2003-01-01T00:00:00Z',
                  pull_requests: [
                    {
                      number: 41,
                      base: { ref: mode === 'wrong-base' ? 'main' : BRANCH },
                    },
                  ],
                },
              ],
      };
    else if (path.endsWith(`/commits/${sha}/pulls`))
      data =
        mode === 'shared-sha' || (mode === 'late-shared' && ++commitReads > 1)
          ? [child, { ...child, number: 60, head: { ref: 'feat/x', sha } }]
          : [child];
    else if (
      path.endsWith('/actions/runs/7/jobs') &&
      searchParams.get('filter') === 'latest'
    )
      data = {
        jobs: Object.entries(lanes).map(([name, conclusion]) => ({
          name,
          head_sha: sha,
          status: 'completed',
          conclusion,
        })),
      };
    else if (path.includes('/check-runs')) data = { check_runs: [] };
    else if (path.includes('/statuses/')) {
      statuses.push({ sha: path.split('/').at(-1), ...body });
      data = {};
    } else throw new Error(`Unexpected request: ${path}`);
    return { ok: true, json: async () => data };
  };
  await import('./scripts/delivery/run.mjs');
  console.log(JSON.stringify({ statuses, exit: process.exitCode ?? 0 }));
  process.exitCode = 0;
}

function run(mode) {
  const output = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `await (${scenario.toString()})(${JSON.stringify(mode)})`,
    ],
    {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        GITHUB_EVENT_NAME: 'schedule',
        GITHUB_EVENT_PATH: '',
        GITHUB_REPOSITORY: 'owner/repo',
        GITHUB_TOKEN: 'mock',
        ONLY_ISSUE: '',
      },
    },
  );
  return JSON.parse(output.trim().split('\n').at(-1));
}

const latest = (statuses, context, sha = 'c'.repeat(40)) =>
  statuses.filter((s) => s.context === context && s.sha === sha).at(-1);

test('a frontend child passes child-verify and Delivery stages without QA or human review', () => {
  const { statuses, exit } = run('pass');
  assert.equal(exit, 0);
  assert.equal(latest(statuses, 'child-verify').state, 'success');
  assert.match(
    latest(statuses, 'child-verify').description,
    /checks, stories passed/,
  );
  assert.equal(latest(statuses, 'Delivery stages').state, 'success');
  assert.match(
    latest(statuses, 'Delivery stages').description,
    /Child of #400/,
  );
  // Both start pending, so an API error cannot leave an older pass current.
  for (const context of ['child-verify', 'Delivery stages'])
    assert.equal(statuses.find((s) => s.context === context).state, 'pending');
});

for (const [mode, context, pattern] of [
  ['ci-fail', 'child-verify', /stories \(failure\)/],
  ['no-ci', 'child-verify', /Waiting for CI/],
  ['no-area', 'child-verify', /area:frontend or area:backend/],
  ['no-review', 'Delivery stages', /agent review has not passed/],
  ['enforcement', 'Delivery stages', /cannot go through integration/],
  ['wrong-base', 'child-verify', /Waiting for CI/],
  ['foreign-branch', 'child-verify', /does not link integration/],
  ['retargeted', 'child-verify', /Waiting for CI/],
  ['late-shared', 'Delivery stages', /#60 share this head/],
  ['shared-sha', 'Delivery stages', /#60 share this head/],
  ['shared-branch', 'Delivery stages', /#60 share this head/],
])
  test(`a child does not pass ${context} on ${mode}`, () => {
    const status = latest(run(mode).statuses, context);
    assert.notEqual(status.state, 'success');
    assert.match(status.description, pattern);
  });

test('a child whose head moves during evaluation reports an error, never a pass', () => {
  const { statuses, exit } = run('push');
  assert.equal(exit, 1);
  for (const context of ['child-verify', 'Delivery stages']) {
    assert.ok(
      !statuses.some((s) => s.context === context && s.state === 'success'),
    );
    assert.equal(latest(statuses, context).state, 'error');
  }
});

test('a parent PR never gets child-verify and waits for open sub-issues and child PRs', () => {
  const parentSha = 'e'.repeat(40);
  for (const [mode, pattern] of [
    ['parent-sub-open', /Sub-issues #401 of #400 are still open/],
    ['parent-child-open', /PRs #41 into integration\/400-rooms are still open/],
  ]) {
    const { statuses } = run(mode);
    assert.ok(
      !statuses.some(
        (s) => s.sha === parentSha && s.context === 'child-verify',
      ),
    );
    const status = latest(statuses, 'Delivery stages', parentSha);
    assert.equal(status.state, 'failure');
    assert.match(status.description, pattern);
  }
  // With the feature finished only the usual gates (here QA) remain.
  const done = latest(run('parent').statuses, 'Delivery stages', parentSha);
  assert.equal(done.state, 'failure');
  assert.match(done.description, /^QA approval by MatejKrones is missing/);
});
