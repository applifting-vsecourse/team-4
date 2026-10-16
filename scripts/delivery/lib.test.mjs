import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluate,
  readyMarker,
  requirementsMarker,
  requirementsApproval,
  requirementsTransition,
  PM,
  QA,
} from './lib.mjs';
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
      {
        user: { login: 'github-actions[bot]' },
        body: requirementsMarker(12, sha, 78, 1) + '\nRequirements approved',
        created_at: time(1),
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

for (const [author, substitute] of [
  [PM, QA],
  [QA, PM],
]) {
  test(`${author}: ${author === PM ? 'QA is required after handoff without requirements approval' : 'substitute must approve requirements then QA separately'}`, () => {
    const f = fixture();
    f.pr.user.login = author;
    if (author === PM)
      f.comments[2].body =
        requirementsMarker(12, sha, 78, 'author-exempt') + '\nAuthor exemption';
    f.reviews = [review(substitute, 1)];
    assert.equal(evaluate(f).pass, false);
    f.reviews.push(review(substitute, 4));
    assert.equal(evaluate(f).pass, true);
    f.reviews.push(review(substitute, 5, 'CHANGES_REQUESTED'));
    assert.equal(evaluate(f).pass, false);
  });
  test(`${author}: author approval and unrelated reviewers cannot substitute`, () => {
    const f = fixture();
    f.pr.user.login = author;
    if (author === PM)
      f.comments[2].body =
        requirementsMarker(12, sha, 78, 'author-exempt') + '\nAuthor exemption';
    f.reviews = [
      review(author, 1),
      review(author, 4),
      review('someone-else', 5),
    ];
    assert.equal(evaluate(f).pass, false);
  });
}

test('PR creation stays in progress until the correct current requirements approval', () => {
  const f = fixture();
  assert.deepEqual(
    requirementsTransition('In Progress', [{ pr: f.pr, reviews: [] }]),
    { status: 'In Progress', review: false },
  );
  assert.deepEqual(requirementsTransition('In Progress', [f]), {
    status: 'Ready for Code Review',
    review: true,
  });
  assert.equal(
    requirementsTransition('Ready for Code Review', [{ pr: f.pr, reviews: [] }])
      .review,
    false,
  );
});
test('every linked PR needs requirements policy satisfied; commits preserve scope approval and drafts block review', () => {
  const f = fixture();
  const other = fixture();
  other.pr = { ...other.pr, number: 13 };
  other.reviews = [];
  assert.equal(requirementsTransition('In Progress', [f, other]).review, false);
  for (const status of [
    'Ready for Code Review',
    'Ready for Testing',
    'Done',
    'Accepted by PO',
  ]) {
    assert.equal(requirementsTransition(status, [other]).status, 'In Progress');
  }
  f.pr.head.sha = 'b'.repeat(40);
  assert.equal(
    requirementsTransition('Ready for Testing', [f]).status,
    'Ready for Testing',
  );
  const draft = fixture();
  draft.pr.draft = true;
  assert.equal(requirementsTransition('In Progress', [draft]).review, false);
});
test('requirements changes requested and dismissal reset the approval cycle', () => {
  const f = fixture();
  f.reviews.push(review(PM, 5, 'CHANGES_REQUESTED'));
  assert.equal(requirementsApproval(f.pr, f.reviews), null);
  f.reviews.push(review(PM, 6));
  assert.equal(requirementsApproval(f.pr, f.reviews).id, 6);
  assert.equal(evaluate(f).pass, false); // old handoff and agent pass no longer count
});
test('a missing, forged or late requirements handoff blocks delivery', () => {
  const missing = fixture();
  missing.comments.pop();
  assert.equal(evaluate(missing).pass, false);
  const forged = fixture();
  forged.comments[2].user.login = 'developer';
  assert.equal(evaluate(forged).pass, false);
  const late = fixture();
  late.comments[2].created_at = time(3);
  assert.equal(evaluate(late).pass, false);
});
test('review comments and a second QA approval preserve the requirements cycle', () => {
  const f = fixture();
  f.pr.user.login = QA;
  f.reviews = [review(PM, 1), review(PM, 4), review(PM, 5, 'COMMENTED')];
  assert.equal(requirementsApproval(f.pr, f.reviews).id, 1);
  assert.equal(evaluate(f).pass, true);
});
test('empty linkage cannot start review and backlog cards do not advance automatically', () => {
  assert.deepEqual(requirementsTransition('Ready for Code Review', []), {
    status: 'In Progress',
    review: false,
  });
  assert.equal(
    requirementsTransition('Product Backlog', [fixture()]).review,
    false,
  );
});

test('David author exemption needs no requirements review but still needs agent review, handoff and Matej QA', () => {
  const f = fixture();
  f.pr.user.login = PM;
  f.reviews = [];
  f.comments[2].body =
    requirementsMarker(12, sha, 78, 'author-exempt') + '\nAuthor exemption';
  assert.equal(requirementsApproval(f.pr, f.reviews).exempt, true);
  assert.equal(requirementsTransition('In Progress', [f]).review, true);
  assert.equal(evaluate(f).pass, false);
  f.reviews = [review(QA, 4)];
  assert.equal(evaluate(f).pass, true);
  f.comments[0].body = f.comments[0].body.replace(
    'result=pass',
    'result=findings',
  );
  assert.equal(evaluate(f).pass, false);
});
test('author exemption applies only to David, and never permits drafts', () => {
  for (const author of [QA, 'developer']) {
    const f = fixture();
    f.pr.user.login = author;
    assert.equal(requirementsApproval(f.pr, []), null);
  }
  const f = fixture();
  f.pr.user.login = PM;
  f.pr.draft = true;
  assert.equal(requirementsApproval(f.pr, []), null);
});

test('an exempt PR cannot advance an issue while another linked PR lacks requirements approval', () => {
  const own = fixture();
  own.pr.user.login = PM;
  own.reviews = [];
  const other = fixture();
  other.reviews = [];
  assert.equal(
    requirementsTransition('In Progress', [own, other]).review,
    false,
  );
  other.reviews = [review(PM, 1)];
  assert.equal(
    requirementsTransition('In Progress', [own, other]).review,
    true,
  );
});
test('new commits on exempt PRs still invalidate agent review and QA', () => {
  const f = fixture();
  f.pr.user.login = PM;
  f.reviews = [review(QA, 4)];
  f.comments[2].body =
    requirementsMarker(12, sha, 78, 'author-exempt') + '\nAuthor exemption';
  f.pr.head.sha = 'b'.repeat(40);
  assert.equal(requirementsApproval(f.pr, []).exempt, true);
  assert.equal(evaluate(f).pass, false);
});
