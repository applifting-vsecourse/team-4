import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { integratedReview } from './feature-github.mjs';

const BRANCH = 'integration/400-rooms';
const REPO = { full_name: 'owner/repo' };
const parentIssue = {
  number: 400,
  subIssues: [{ number: 401 }, { number: 402 }],
};
const parentPr = (head = 'm2', repo = REPO) => ({
  number: 50,
  base: { ref: 'main', repo: REPO },
  head: { ref: BRANCH, sha: head, repo },
});
const bot = (body) => ({
  user: { login: 'github-actions[bot]' },
  created_at: '2005-01-01T00:00:00Z',
  body,
});
const verdict = (number, sha, issue, result = 'pass') =>
  bot(
    `<!-- agent-review-scope issue=${issue} -->\n<!-- agent-review pr=${number} sha=${sha} result=${result} attempt=1 -->\n`,
  );

// History: the branch starts at b0 on main. Child PR #41 (commits a1, a2) is
// merged by m1, then integration PR #42 (commit c1) by m2.
function github({
  parents = {},
  comments = {
    41: [verdict(41, 'a2', 401)],
    42: [verdict(42, 'c1', 400)],
    43: [verdict(43, 'm2', 400)],
  },
  merges = { 41: 'm1', 42: 'm2' },
  timelines = {},
  rules = [
    'deletion',
    'non_fast_forward',
    'pull_request',
    'required_status_checks',
  ],
  checks = ['child-verify', 'Delivery stages'],
} = {}) {
  const graph = {
    b0: [],
    a1: ['b0'],
    a2: ['a1'],
    m1: ['b0', 'a2'],
    c1: ['m1'],
    m2: ['m1', 'c1'],
    x9: ['m2'],
    s1: ['b0'],
    ...parents,
  };
  const onMain = new Set(['b0']);
  const prs = [
    { number: 41, head: { sha: 'a2' } },
    { number: 42, head: { sha: 'c1' } },
  ].map((pr) => ({
    ...pr,
    merged_at: '2005-01-01T00:00:00Z',
    merge_commit_sha: merges[pr.number],
    base: { ref: BRANCH },
  }));
  const calls = [];
  const get = async (path) => {
    calls.push(path);
    const url = new URL(path, 'https://api.github.com');
    const page = Number(url.searchParams.get('page') ?? 1);
    if (url.pathname.includes('/compare/')) {
      const [from, to] = url.pathname.split('/compare/')[1].split('...');
      assert.equal(to, 'main');
      return { status: onMain.has(from) ? 'ahead' : 'diverged' };
    }
    if (url.pathname.startsWith('/repos/owner/repo/commits/'))
      return {
        parents: graph[url.pathname.split('/').at(-1)].map((sha) => ({ sha })),
      };
    if (url.pathname === '/repos/owner/repo/pulls') {
      assert.equal(url.searchParams.get('base'), BRANCH);
      return page === 1
        ? [
            ...prs,
            // Closed unmerged, with a reviewed head and a test-merge commit
            // that is the pushed x9: it is not a merge into the branch.
            {
              number: 43,
              merged_at: null,
              merge_commit_sha: 'x9',
              base: { ref: BRANCH },
              head: { sha: 'm2' },
            },
          ]
        : [];
    }
    if (
      url.pathname ===
      `/repos/owner/repo/rules/branches/${encodeURIComponent(BRANCH)}`
    )
      return page === 1
        ? rules.map((type) => ({
            type,
            parameters:
              type === 'required_status_checks'
                ? {
                    required_status_checks: checks.map((context) => ({
                      context,
                      integration_id: 15368,
                    })),
                  }
                : {},
          }))
        : [];
    if (url.pathname.endsWith('/timeline'))
      return page === 1
        ? (timelines[Number(url.pathname.split('/').at(-2))] ?? [])
        : [];
    if (url.pathname.endsWith('/comments'))
      return page === 1
        ? (comments[Number(url.pathname.split('/').at(-2))] ?? [])
        : [];
    throw new Error(`Unexpected ${path}`);
  };
  get.calls = calls;
  return get;
}
const review = (get, pr = parentPr()) =>
  integratedReview({ get, repo: 'owner/repo', pr, parent: parentIssue });

test('a parent branch made only of reviewed PR merges is covered', async () => {
  assert.deepEqual(await review(github()), {
    covered: true,
    prs: [42, 41],
    missing: [],
  });
  // A squash merge of a reviewed PR counts as well.
  assert.deepEqual(
    await review(
      github({ merges: { 41: 's1', 42: 'm2' }, parents: { m2: ['s1', 'c1'] } }),
    ),
    { covered: true, prs: [42, 41], missing: [] },
  );
});

test('a commit that is not a reviewed PR merge is never covered', async () => {
  for (const [name, get, pr, missing] of [
    ['a direct push on top', github(), parentPr('x9'), 'x9'],
    // The reviewed head was a2, the merged net change; a1 alone was never reviewed.
    [
      'a branch rewritten to an intermediate commit',
      github(),
      parentPr('a1'),
      'a1',
    ],
    [
      'a merge whose second parent is not the reviewed head',
      github({ parents: { m1: ['b0', 'a1'] } }),
      parentPr(),
      'm1',
    ],
  ]) {
    const result = await review(get, pr);
    assert.equal(result.covered, false, name);
    assert.deepEqual(result.missing, [missing], name);
  }
});

test('a merged PR without a pass for its final head, under the feature, is not covered', async () => {
  for (const [name, comments] of [
    ['no verdict', { 41: [], 42: [verdict(42, 'c1', 400)] }],
    [
      'a pass on an earlier head',
      { 41: [verdict(41, 'a1', 401)], 42: [verdict(42, 'c1', 400)] },
    ],
    [
      'a later failing verdict',
      {
        41: [verdict(41, 'a2', 401), verdict(41, 'a2', 401, 'findings')],
        42: [verdict(42, 'c1', 400)],
      },
    ],
    [
      'a pass under an unrelated issue',
      { 41: [verdict(41, 'a2', 999)], 42: [verdict(42, 'c1', 400)] },
    ],
    [
      'a non-bot verdict',
      {
        41: [{ ...verdict(41, 'a2', 401), user: { login: 'someone' } }],
        42: [verdict(42, 'c1', 400)],
      },
    ],
  ]) {
    const result = await review(github({ comments }));
    assert.equal(result.covered, false, name);
    assert.deepEqual(result.missing, ['m1'], name);
  }
});

test('nothing is covered without the integration branch ruleset', async () => {
  for (const options of [
    { rules: ['deletion', 'pull_request', 'required_status_checks'] },
    { rules: ['non_fast_forward', 'pull_request', 'required_status_checks'] },
    { checks: ['Delivery stages'] },
  ]) {
    const get = github(options);
    const result = await review(get);
    assert.equal(result.covered, false);
    assert.match(result.missing[0], /not protected/);
    assert.ok(!get.calls.some((path) => path.includes('/compare/')));
  }
});

test('a verdict from before a merged PR was retargeted does not cover it', async () => {
  const result = await review(
    github({
      timelines: {
        41: [{ event: 'base_ref_changed', created_at: '2006-01-01T00:00:00Z' }],
      },
    }),
  );
  assert.equal(result.covered, false);
  assert.deepEqual(result.missing, ['m1']);
});

test('a fork head or a branch with no merges is never covered', async () => {
  const get = github();
  assert.equal(
    (await review(get, parentPr('m2', { full_name: 'someone/repo' }))).covered,
    false,
  );
  assert.deepEqual(get.calls, []);
  assert.equal((await review(github(), parentPr('b0'))).covered, false);
});

// The real close script against a mocked GitHub.
async function closeScenario(mode) {
  const { writeFileSync } = await import('node:fs');
  const BRANCH = 'integration/400-rooms';
  writeFileSync(
    process.env.GITHUB_EVENT_PATH,
    JSON.stringify({ pull_request: { number: 41 } }),
  );
  const calls = [];
  const conn = (nodes) => ({ nodes, pageInfo: { hasNextPage: false } });
  const branch = conn([
    { ref: { name: BRANCH, repository: { nameWithOwner: 'owner/repo' } } },
  ]);
  globalThis.fetch = async (url, options = {}) => {
    const path = new URL(url).pathname;
    const body = options.body ? JSON.parse(options.body) : {};
    calls.push(`${options.method ?? 'GET'} ${path}`);
    let data = {};
    if (path === '/repos/owner/repo/pulls/41')
      data = {
        number: 41,
        merged_at: mode === 'unmerged' ? null : '2005-01-01T00:00:00Z',
        body:
          {
            integration: 'Refs #400',
            partial: 'Refs #401',
            // Edited after the merge to complete the other side.
            relinked: 'Closes #402',
          }[mode] ?? 'Closes #401',
        base: { ref: BRANCH },
        head: { ref: 'feat/401', sha: 'a'.repeat(40) },
      };
    else if (path === '/graphql')
      data = {
        data: {
          repository: {
            issue:
              body.variables.number === 402
                ? {
                    number: 402,
                    state: 'OPEN',
                    labels: conn([{ name: 'area:backend' }]),
                    linkedBranches: conn([]),
                    parent: {
                      number: 400,
                      state: 'OPEN',
                      repository: { nameWithOwner: 'owner/repo' },
                      linkedBranches: branch,
                    },
                    subIssues: conn([]),
                  }
                : body.variables.number === 400
                  ? {
                      number: 400,
                      state: 'OPEN',
                      labels: conn([]),
                      linkedBranches: branch,
                      parent: null,
                      subIssues: conn([]),
                    }
                  : {
                      number: 401,
                      state: 'OPEN',
                      labels: conn([{ name: 'area:frontend' }]),
                      linkedBranches: conn([]),
                      parent: {
                        number: 400,
                        state: 'OPEN',
                        repository: { nameWithOwner: 'owner/repo' },
                        linkedBranches: branch,
                      },
                      subIssues: conn([]),
                    },
          },
        },
      };
    else if (path === '/repos/owner/repo/issues/41/timeline') data = [];
    else if (path === '/repos/owner/repo/issues/41/comments')
      // The merged head passed review for #401 only.
      data =
        mode === 'unreviewed'
          ? []
          : [
              {
                user: { login: 'github-actions[bot]' },
                created_at: '2005-01-01T00:00:00Z',
                body: `<!-- agent-review-scope issue=401 -->\n<!-- agent-review pr=41 sha=${'a'.repeat(40)} result=pass attempt=1 -->\n`,
              },
            ];
    else if (options.method === 'PATCH') calls.push(JSON.stringify(body));
    return { ok: true, json: async () => data };
  };
  await import('./scripts/delivery/close-child.mjs');
  console.log(
    JSON.stringify(
      calls.filter(
        (c) =>
          c.startsWith('PATCH') ||
          c.startsWith('POST /repos') ||
          c.startsWith('{'),
      ),
    ),
  );
}

function close(mode) {
  const output = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `await (${closeScenario.toString()})(${JSON.stringify(mode)})`,
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        GITHUB_EVENT_PATH: `${process.env.TMPDIR ?? '/tmp'}/close-child-${process.pid}-${mode}.json`,
        GITHUB_REPOSITORY: 'owner/repo',
        GITHUB_TOKEN: 'mock',
      },
    },
  );
  return JSON.parse(output.trim().split('\n').at(-1));
}

test('a merged child PR closes its sub-issue as completed', () => {
  // Closed first, so a failed close is retried without a second comment.
  assert.deepEqual(close('child'), [
    'PATCH /repos/owner/repo/issues/401',
    JSON.stringify({ state: 'closed', state_reason: 'completed' }),
    'POST /repos/owner/repo/issues/401/comments',
  ]);
});

for (const mode of [
  'unmerged',
  'integration',
  'partial',
  'relinked',
  'unreviewed',
])
  test(`a merged PR closes nothing when it is ${mode}`, () => {
    assert.deepEqual(close(mode), []);
  });
