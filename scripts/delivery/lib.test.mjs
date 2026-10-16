import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, readyMarker, PM, QA } from './lib.mjs';
const sha = 'a'.repeat(40);
const time = (second) => `2026-10-16T14:00:${String(second).padStart(2, '0')}Z`;
function review(login, second, state = 'APPROVED', commit = sha) {
  return {
    id: second,
    user: { login },
    state,
    commit_id: commit,
    submitted_at: time(second),
  };
}
function fixture() {
  return {
    pr: {
      number: 12,
      head: { sha },
      user: { login: 'developer' },
      draft: false,
    },
    issues: [{ number: 78 }],
    reviews: [review(PM, 1), review(QA, 4)],
    comments: [
      {
        user: { login: 'github-actions[bot]' },
        body: `<!-- agent-review-scope issue=78 -->\n<!-- agent-review pr=12 sha=${sha} result=pass attempt=1 -->`,
        created_at: time(2),
      },
      {
        user: { login: 'github-actions[bot]' },
        body: readyMarker(12, sha, 78) + '\nReady for testing',
        created_at: time(3),
      },
    ],
  };
}
test('requirements + agent review + readiness precede QA on the exact head', () => {
  assert.equal(evaluate(fixture()).pass, true);
});
test('PM approval alone cannot permit merging', () => {
  const f = fixture();
  f.reviews = [review(PM, 1)];
  assert.equal(evaluate(f).pass, false);
});
test('QA cannot approve before testing handoff', () => {
  const f = fixture();
  f.reviews[1] = review(QA, 2);
  assert.equal(evaluate(f).pass, false);
});
test('new commits invalidate every stage', () => {
  const f = fixture();
  f.pr.head.sha = 'b'.repeat(40);
  assert.equal(evaluate(f).pass, false);
});
test('dismissed approvals and changes requested override old approvals', () => {
  for (const state of ['DISMISSED', 'CHANGES_REQUESTED']) {
    const f = fixture();
    f.reviews.push(review(PM, 5, state));
    assert.equal(evaluate(f).pass, false);
  }
});
test('ordinary comments do not dismiss an approval', () => {
  const f = fixture();
  f.reviews.push(review(PM, 5, 'COMMENTED'));
  assert.equal(evaluate(f).pass, true);
});
test('forged handoffs and verdicts are rejected', () => {
  for (const index of [0, 1]) {
    const f = fixture();
    f.comments[index].user.login = 'developer';
    assert.equal(evaluate(f).pass, false);
  }
});
test('every linked issue must pass, no linked issue fails closed', () => {
  const f = fixture();
  f.issues.push({ number: 79 });
  assert.equal(evaluate(f).pass, false);
  f.issues = [];
  assert.equal(evaluate(f).pass, false);
});
test('a later agent failure supersedes a historical pass', () => {
  const f = fixture();
  f.comments.push({
    ...f.comments[0],
    body: f.comments[0].body.replace('result=pass', 'result=error'),
    created_at: time(5),
  });
  assert.equal(evaluate(f).pass, false);
});
test('drafts, wrong reviewers, and self-review cannot pass', () => {
  const draft = fixture();
  draft.pr.draft = true;
  assert.equal(evaluate(draft).pass, false);
  for (const login of [PM, QA]) {
    const f = fixture();
    f.pr.user.login = login;
    assert.equal(evaluate(f).pass, false);
  }
  const f = fixture();
  f.reviews[1].user.login = 'someone-else';
  assert.equal(evaluate(f).pass, false);
});

test('markers quoted inside findings cannot forge a passing verdict or handoff', () => {
  const f = fixture();
  f.comments[0].body =
    f.comments[0].body.replace('result=pass', 'result=findings') +
    '\n' +
    f.comments[0].body;
  assert.equal(evaluate(f).pass, false);
  const g = fixture();
  g.comments[1].body = 'Quoted marker: ' + g.comments[1].body;
  assert.equal(evaluate(g).pass, false);
});
