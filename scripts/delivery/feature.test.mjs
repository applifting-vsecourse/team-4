import assert from 'node:assert/strict';
import test from 'node:test';
import {
  childVerify,
  integrationRole,
  integrationStages,
  isIntegrationBranch,
  parentReasons,
} from './feature.mjs';
import { buildStacks } from './stack.mjs';

const BRANCH = 'integration/400-rooms';
const sha = 'c'.repeat(40);
const pr = (overrides = {}) => ({
  number: 41,
  draft: false,
  base: { ref: BRANCH },
  head: { ref: 'feat/401-rooms-ui', sha },
  ...overrides,
});
const sub = (overrides = {}) => ({
  number: 401,
  state: 'OPEN',
  labels: ['area:frontend'],
  branches: [],
  parent: { number: 400, state: 'OPEN', branches: [BRANCH] },
  ...overrides,
});
const parentIssue = (overrides = {}) => ({
  number: 400,
  state: 'OPEN',
  labels: [],
  branches: [BRANCH],
  parent: null,
  subIssues: [
    {
      number: 401,
      state: 'CLOSED',
      stateReason: 'COMPLETED',
      labels: ['area:frontend'],
    },
    {
      number: 402,
      state: 'CLOSED',
      stateReason: 'COMPLETED',
      labels: ['area:backend'],
    },
  ],
  ...overrides,
});
const passVerdict = (issue, prNumber = 41) => ({
  user: { login: 'github-actions[bot]' },
  body: `<!-- agent-review-scope issue=${issue} -->\n<!-- agent-review pr=${prNumber} sha=${sha} result=pass attempt=1 -->\n`,
});
const jobs = (results) =>
  Object.entries(results).map(([name, conclusion]) => ({
    name,
    status: conclusion ? 'completed' : 'in_progress',
    conclusion,
  }));

test('only named branches under integration/ are integration branches', () => {
  assert.ok(isIntegrationBranch(BRANCH));
  for (const ref of [
    'integration/',
    'main',
    'feature/x',
    'x/integration/y',
    undefined,
  ])
    assert.ok(!isIntegrationBranch(ref));
});

test('a PR into another branch has no integration role', () => {
  assert.equal(
    integrationRole({ pr: pr({ base: { ref: 'main' } }), issues: [sub()] }),
    null,
  );
});

test('a sub-issue with one area label whose parent links the base is a child', () => {
  assert.deepEqual(integrationRole({ pr: pr(), issues: [sub()] }), {
    kind: 'child',
    area: 'frontend',
    issue: 401,
    parent: 400,
    lanes: ['checks', 'stories'],
  });
  assert.deepEqual(
    integrationRole({ pr: pr(), issues: [sub({ labels: ['area:backend'] })] })
      .lanes,
    ['checks', 'database'],
  );
});

test('the parent issue linking the base makes integration work needing every lane but E2E', () => {
  assert.deepEqual(integrationRole({ pr: pr(), issues: [parentIssue()] }), {
    kind: 'integration',
    issue: 400,
    parent: 400,
    lanes: ['checks', 'database', 'stories'],
  });
});

for (const [name, issues] of [
  ['no linked issue', []],
  [
    'two linked issues',
    [sub(), sub({ number: 402, labels: ['area:backend'] })],
  ],
  ['a closed sub-issue', [sub({ state: 'CLOSED' })]],
  ['no area label', [sub({ labels: [] })]],
  ['both area labels', [sub({ labels: ['area:frontend', 'area:backend'] })]],
  [
    'a parent linking another branch',
    [
      sub({
        parent: { number: 400, state: 'OPEN', branches: ['integration/9-x'] },
      }),
    ],
  ],
  [
    'a closed parent issue',
    [sub({ parent: { number: 400, state: 'CLOSED', branches: [BRANCH] } })],
  ],
  ['an unrelated issue', [parentIssue({ branches: [] })]],
])
  test(`a PR into an integration branch with ${name} is invalid`, () => {
    const role = integrationRole({ pr: pr(), issues });
    assert.equal(role.kind, 'invalid');
    assert.ok(role.reason);
  });

test('child-verify passes only when the lanes for the role passed', () => {
  const role = integrationRole({ pr: pr(), issues: [sub()] });
  // E2E and database are not required for a frontend child.
  assert.equal(
    childVerify({
      role,
      jobs: jobs({
        checks: 'success',
        stories: 'success',
        database: 'failure',
        e2e: 'skipped',
      }),
    }).state,
    'success',
  );
  assert.equal(
    childVerify({ role, jobs: jobs({ checks: 'success', stories: 'skipped' }) })
      .state,
    'failure',
  );
  assert.equal(
    childVerify({ role, jobs: jobs({ checks: 'success', stories: null }) })
      .state,
    'pending',
  );
  assert.equal(
    childVerify({ role, jobs: jobs({ checks: 'success' }) }).state,
    'pending',
  );
  assert.equal(childVerify({ role, jobs: null }).state, 'pending');
});

test('child-verify fails for invalid PRs and PRs outside integration branches', () => {
  assert.equal(childVerify({ role: null, jobs: [] }).state, 'failure');
  const role = integrationRole({ pr: pr(), issues: [] });
  assert.deepEqual(childVerify({ role, jobs: jobs({ checks: 'success' }) }), {
    state: 'failure',
    description: role.reason,
  });
});

test('integration stages need only a current agent review pass', () => {
  const role = integrationRole({ pr: pr(), issues: [sub()] });
  const files = [{ filename: 'apps/frontend/src/features/rooms/RoomList.tsx' }];
  assert.deepEqual(
    integrationStages({ pr: pr(), role, files, comments: [passVerdict(401)] }),
    [],
  );
  assert.equal(
    integrationStages({ pr: pr(), role, files, comments: [] }).length,
    1,
  );
  // A verdict for another PR, commit or issue does not count.
  for (const comment of [passVerdict(400), passVerdict(401, 42)])
    assert.equal(
      integrationStages({ pr: pr(), role, files, comments: [comment] }).length,
      1,
    );
  assert.equal(
    integrationStages({
      pr: pr({ head: { ref: 'x', sha: 'd'.repeat(40) } }),
      role,
      files,
      comments: [passVerdict(401)],
    }).length,
    1,
  );
  // A later failing verdict replaces an earlier pass.
  const failed = passVerdict(401);
  failed.body = failed.body.replace('result=pass', 'result=fail');
  assert.equal(
    integrationStages({
      pr: pr(),
      role,
      files,
      comments: [passVerdict(401), failed],
    }).length,
    1,
  );
  assert.deepEqual(
    integrationStages({
      pr: pr(),
      role,
      files,
      comments: [],
      waiver: { at: 'now' },
    }),
    [],
  );
});

test('integration stages block drafts, enforcement changes and invalid links', () => {
  const role = integrationRole({ pr: pr(), issues: [sub()] });
  const comments = [passVerdict(401)];
  assert.match(
    integrationStages({
      pr: pr({ draft: true }),
      role,
      files: [],
      comments,
    }).join(' '),
    /draft/,
  );
  for (const file of [
    { filename: '.github/workflows/ci.yml' },
    { filename: 'scripts/delivery/run.mjs' },
    { filename: 'docs/notes.md', previous_filename: 'CLAUDE.md' },
  ])
    assert.match(
      integrationStages({ pr: pr(), role, files: [file], comments }).join(' '),
      /enforcement/,
    );
  assert.equal(
    integrationStages({
      pr: pr(),
      role: integrationRole({ pr: pr(), issues: [] }),
      files: [],
      comments,
    }).length,
    1,
  );
});

test('a parent PR is eligible once both areas exist, all sub-issues closed and nothing is open into the branch', () => {
  const parentPr = pr({
    number: 50,
    base: { ref: 'main' },
    head: { ref: BRANCH, sha },
  });
  assert.deepEqual(
    parentReasons({ pr: parentPr, issues: [parentIssue()], openInto: [] }),
    [],
  );
  const reasons = (issue, openInto = []) =>
    parentReasons({ pr: parentPr, issues: [issue], openInto }).join(' ');
  assert.match(
    reasons(
      parentIssue({
        subIssues: [
          {
            number: 401,
            state: 'CLOSED',
            stateReason: 'COMPLETED',
            labels: ['area:frontend'],
          },
        ],
      }),
    ),
    /area:backend/,
  );
  assert.match(
    reasons(
      parentIssue({
        subIssues: [
          { number: 401, state: 'OPEN', labels: ['area:frontend'] },
          {
            number: 402,
            state: 'CLOSED',
            stateReason: 'COMPLETED',
            labels: ['area:backend'],
          },
        ],
      }),
    ),
    /#401 of #400 are still open/,
  );
  assert.match(reasons(parentIssue(), [{ number: 41 }]), /#41 into/);
  assert.match(
    reasons(parentIssue({ branches: [] })),
    /must link the one parent issue/,
  );
});

test('a sub-issue closed as not planned does not complete its area', () => {
  const parentPr = pr({
    number: 50,
    base: { ref: 'main' },
    head: { ref: BRANCH, sha },
  });
  const issue = parentIssue({
    subIssues: [
      {
        number: 401,
        state: 'CLOSED',
        stateReason: 'NOT_PLANNED',
        labels: ['area:frontend'],
      },
      {
        number: 402,
        state: 'CLOSED',
        stateReason: 'COMPLETED',
        labels: ['area:backend'],
      },
    ],
  });
  assert.deepEqual(
    parentReasons({ pr: parentPr, issues: [issue], openInto: [] }),
    ['Parent issue #400 has no completed area:frontend sub-issue.'],
  );
  // An extra sub-issue dropped as not planned is fine once its area is done.
  issue.subIssues.push({
    number: 403,
    state: 'CLOSED',
    stateReason: 'COMPLETED',
    labels: ['area:frontend'],
  });
  assert.deepEqual(
    parentReasons({ pr: parentPr, issues: [issue], openInto: [] }),
    [],
  );
});

test('a parent issue under an epic still owns its integration work', () => {
  const issue = parentIssue({ parent: { number: 1, branches: [] } });
  assert.equal(
    integrationRole({ pr: pr(), issues: [issue] }).kind,
    'integration',
  );
});

test('a PR sharing its head with another open PR never passes', () => {
  const role = integrationRole({ pr: pr(), issues: [sub()] });
  assert.match(
    integrationStages({
      pr: pr(),
      role,
      files: [],
      comments: [passVerdict(401)],
      sharedHead: [{ number: 60 }],
    }).join(' '),
    /#60 share this head/,
  );
});

test('a PR from an ordinary branch has no parent conditions', () => {
  assert.deepEqual(
    parentReasons({
      pr: pr({ base: { ref: 'main' }, head: { ref: 'feat/x', sha } }),
      issues: [],
      openInto: [],
    }),
    [],
  );
});

test('children of an integration branch are not stacked on the parent PR', () => {
  const user = { login: 'developer' };
  const parentPr = {
    number: 50,
    user,
    base: { ref: 'main' },
    head: { ref: BRANCH },
  };
  const child = {
    number: 41,
    user,
    base: { ref: BRANCH },
    head: { ref: 'feat/401' },
  };
  const { stacks, problems } = buildStacks([parentPr, child]);
  assert.deepEqual(problems, []);
  assert.deepEqual(
    stacks.map((stack) => stack.prs.map((p) => p.number)),
    [[50]],
  );
});
