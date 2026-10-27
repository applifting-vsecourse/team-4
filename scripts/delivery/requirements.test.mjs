import test from 'node:test';
import assert from 'node:assert/strict';
import { issueRequirements, scopeMarker, scopeHash } from './requirements.mjs';
import {
  requirementsApproval,
  requirementsMarker,
  readyMarker,
  evaluate,
} from './lib.mjs';
const issue = {
  number: 79,
  title: 'Design system',
  body: 'Use semantic tokens',
};
const at = (n) => `2026-10-16T20:00:${String(n).padStart(2, '0')}Z`;
const pr = {
  number: 104,
  labels: [{ name: 'severity:high' }],
  user: { login: 'JakubHerr' },
  draft: false,
  head: { sha: 'a'.repeat(40) },
};
const review = {
  id: 10,
  user: { login: 'darebakdavca' },
  state: 'APPROVED',
  commit_id: pr.head.sha,
  submitted_at: at(1),
};
const snapshots = [{ pr, reviews: [review] }];
const bot = (kind, data) => ({
  user: { login: 'github-actions[bot]' },
  body: scopeMarker(kind, data) + '\nRecorded',
  created_at: at(2),
});
const command = (
  body,
  id = 20,
  login = 'JakubHerr',
  association = 'COLLABORATOR',
  second = 3,
) => ({
  id,
  user: { login },
  author_association: association,
  body,
  created_at: at(second),
});
function granted() {
  const decision = issueRequirements(issue, [], snapshots);
  return {
    decision,
    comments: [bot('issue-requirements', decision.grantRecord)],
  };
}
test('scope approval is recorded once and survives code pushes and native stale dismissal', () => {
  const { decision, comments } = granted();
  const changed = { ...pr, head: { sha: 'b'.repeat(40) } };
  const after = issueRequirements(issue, comments, [
    { pr: changed, reviews: [{ ...review, state: 'DISMISSED' }] },
  ]);
  assert.deepEqual(after.approval, decision.approval);
  assert.equal(after.grantRecord, undefined);
  assert.equal(
    requirementsApproval({ ...changed, requirements: after.approval }, []).id,
    decision.approval.id,
  );
});
test('stored issue approval applies to new linked implementation PRs', () => {
  const { decision, comments } = granted();
  const after = issueRequirements(issue, comments, [
    { pr: { ...pr, number: 999 }, reviews: [] },
  ]);
  assert.equal(after.approval.id, decision.approval.id);
});
test('a trusted scope re-review request blocks until a fresh PM approval', () => {
  const { comments } = granted();
  comments.push(command('/requirements-rereview'));
  const blocked = issueRequirements(issue, comments, snapshots);
  assert.equal(blocked.approval, null);
  comments.push(bot('requirements-reset', blocked.resetRecord));
  comments.splice(1, 1); // deleting the command must not resurrect the old grant
  assert.equal(issueRequirements(issue, comments, snapshots).approval, null);
  const approved = issueRequirements(issue, comments, [
    { pr, reviews: [review, { ...review, id: 11, submitted_at: at(4) }] },
  ]);
  assert.ok(approved.approval);
  assert.notEqual(
    approved.approval.id,
    issueRequirements(issue, comments.slice(0, 1), snapshots).approval.id,
  );
});
test('scope/title edits invalidate approval and cannot reuse a previously consumed review', () => {
  const { comments } = granted();
  assert.equal(
    issueRequirements(
      { ...issue, body: 'Different scope' },
      comments,
      snapshots,
    ).approval,
    null,
  );
  assert.equal(
    issueRequirements(
      { ...issue, title: 'Different title' },
      comments,
      snapshots,
    ).approval,
    null,
  );
});
test('only the PM can approve through an issue command; collaborators may request re-review', () => {
  assert.equal(
    issueRequirements(issue, [command('/requirements-approve')], []).approval,
    null,
  );
  assert.ok(
    issueRequirements(
      issue,
      [command('/requirements-approve', 21, 'darebakdavca')],
      [],
    ).approval,
  );
  const { comments } = granted();
  const publicRequest = command(
    '/requirements-rereview',
    22,
    'outsider',
    'NONE',
  );
  assert.ok(
    issueRequirements(issue, [...comments, publicRequest], []).approval,
  );
  assert.equal(
    issueRequirements(
      issue,
      [...comments, command('/requirements-rereview')],
      [],
    ).approval,
    null,
  );
});
test('forged/quoted grants and David author exemptions cannot approve other PRs', () => {
  const { comments } = granted();
  assert.equal(
    issueRequirements(
      issue,
      [{ ...comments[0], user: { login: 'outsider' } }],
      [],
    ).approval,
    null,
  );
  assert.equal(
    issueRequirements(
      issue,
      [{ ...comments[0], body: 'Quoted ' + comments[0].body }],
      [],
    ).approval,
    null,
  );
  assert.equal(
    issueRequirements(
      issue,
      [],
      [{ pr: { ...pr, user: { login: 'darebakdavca' } }, reviews: [review] }],
    ).approval,
    null,
  );
});
test('code and QA remain commit-specific despite persistent requirements approval', () => {
  const { comments } = granted();
  const newSha = 'b'.repeat(40);
  const changed = { ...pr, head: { sha: newSha } };
  const scope = issueRequirements(issue, comments, []);
  const botComment = (body, second) => ({
    user: { login: 'github-actions[bot]' },
    body,
    created_at: at(second),
  });
  const data = {
    pr: changed,
    issues: [
      {
        ...issue,
        requirements: scope.approval,
        requirementsVersion: scope.version,
      },
    ],
    reviews: [
      { ...review, state: 'DISMISSED' },
      {
        id: 30,
        user: { login: 'MatejKrones' },
        state: 'APPROVED',
        commit_id: newSha,
        submitted_at: at(8),
      },
    ],
    comments: [
      botComment(
        requirementsMarker(104, newSha, 79, scope.approval.id) +
          '\nScope accepted',
        4,
      ),
      botComment(
        `<!-- agent-review-scope issue=79 -->\n<!-- agent-review pr=104 sha=${newSha} result=pass attempt=1 -->`,
        5,
      ),
      botComment(readyMarker(104, newSha, 79) + '\nTesting handoff', 6),
    ],
  };
  assert.equal(evaluate(data).pass, true);
  data.reviews[1].commit_id = pr.head.sha;
  assert.equal(evaluate(data).pass, false);
});
test('scope changes require new approval on High David PRs too', () => {
  const own = { ...pr, user: { login: 'darebakdavca' } };
  assert.equal(requirementsApproval(own, []), null);
});
test('Bogdan grants and persists issue scope approval through commands and reviews', () => {
  const decision = issueRequirements(
    issue,
    [command('/requirements-approve', 21, 'rmnskb')],
    [],
  );
  assert.equal(decision.approval.reviewer, 'rmnskb');
  const stored = issueRequirements(
    issue,
    [bot('issue-requirements', decision.grantRecord)],
    [],
  );
  assert.equal(stored.approval.id, decision.approval.id);
  const fromReview = issueRequirements(
    issue,
    [],
    [{ pr, reviews: [{ ...review, user: { login: 'rmnskb' } }] }],
  );
  assert.equal(fromReview.approval.reviewer, 'rmnskb');
});

test('an unused historical QA approval cannot approve a subsequently edited scope', () => {
  const { comments } = granted();
  const changed = { ...issue, body: 'Changed scope', updated_at: at(6) };
  const pastQA = { ...review, id: 11, submitted_at: at(4) };
  const blocked = issueRequirements(changed, comments, [
    { pr, reviews: [review, pastQA] },
  ]);
  assert.equal(blocked.approval, null);
  comments.push(bot('requirements-reset', blocked.resetRecord));
  assert.equal(
    issueRequirements({ ...changed, updated_at: at(9) }, comments, [
      { pr, reviews: [review, pastQA] },
    ]).approval,
    null,
  );
  const accepted = issueRequirements(changed, comments, [
    {
      pr,
      reviews: [review, pastQA, { ...review, id: 12, submitted_at: at(7) }],
    },
  ]);
  assert.ok(accepted.approval);
});

test('progress checkboxes and completion evidence preserve approval and review identity', () => {
  const original = {
    ...issue,
    body: '## Podmínky dokončení\n- [ ] Isolated data\n\n## Evidence dokončení\nPending\n\n## Mimo rozsah\nRoles',
  };
  const first = issueRequirements(original, [], snapshots);
  const comments = [bot('issue-requirements', first.grantRecord)];
  const updated = {
    ...original,
    body: original.body
      .replace('[ ]', '[x]')
      .replace('Pending', 'Test report: https://example.test/report'),
  };
  const after = issueRequirements(updated, comments, snapshots);
  assert.deepEqual(after.approval, first.approval);
  assert.equal(after.version, first.version);
  assert.equal(after.resetRecord, null);
  assert.equal(scopeHash(updated), scopeHash(original));
  for (const body of [
    updated.body.replace('Isolated data', 'Shared data'),
    updated.body.replace('Roles', 'Payments'),
  ]) {
    assert.equal(
      issueRequirements({ ...updated, body }, comments, snapshots).approval,
      null,
    );
  }
});
test('requirements links and headings in code blocks remain scope', () => {
  assert.notEqual(
    scopeHash({ ...issue, body: 'https://example.test/a' }),
    scopeHash({ ...issue, body: 'https://example.test/b' }),
  );
  const body = '```md\n## Evidence dokončení\nRequirement\n```';
  assert.notEqual(
    scopeHash({ ...issue, body }),
    scopeHash({ ...issue, body: body.replace('Requirement', 'Changed') }),
  );
});

test('evidence exclusion ends before the next requirement section', () => {
  const body =
    '## Scope\n- [ ] Required\n## Evidence dokončení\nreport\n### Details\nreport detail\n## Acceptance\nMust work';
  assert.equal(
    scopeHash({ ...issue, body }),
    scopeHash({ ...issue, body: body.replace('report detail', 'new report') }),
  );
  assert.notEqual(
    scopeHash({ ...issue, body }),
    scopeHash({
      ...issue,
      body: body.replace('Must work', 'Different requirement'),
    }),
  );
});
test('fenced examples cannot hide requirements after a short inner fence', () => {
  const body =
    '````md\n```\n## Evidence dokončení\nRequired\n````\n## Other\nText';
  assert.notEqual(
    scopeHash({ ...issue, body }),
    scopeHash({ ...issue, body: body.replace('Required', 'Changed') }),
  );
});

test('issues with no body have a stable empty scope', () => {
  assert.equal(
    scopeHash({ ...issue, body: null }),
    scopeHash({ ...issue, body: '' }),
  );
});

test('a Standard QA approval cannot seed High scope approval', () => {
  assert.equal(
    issueRequirements(
      issue,
      [],
      [{ pr: { ...pr, labels: [] }, reviews: [review] }],
    ).approval,
    null,
  );
});
test('Standard scope changes refresh review markers without waiting for approval', () => {
  const a = issueRequirements(issue, [], []);
  const b = issueRequirements({ ...issue, body: 'New scope' }, [], []);
  const standard = { ...pr, labels: [] };
  assert.notEqual(
    requirementsApproval({ ...standard, requirementsVersion: a.version }, [])
      .id,
    requirementsApproval({ ...standard, requirementsVersion: b.version }, [])
      .id,
  );
});
