import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isReviewCommand, reviewRequested } from './command.mjs';

const comment = (overrides = {}) => ({
  body: '/review',
  association: 'MEMBER',
  isPullRequest: true,
  ...overrides,
});

test('only /review alone on the first line is a command', () => {
  for (const body of ['/review', '/review  ', '/review\nplease look at auth'])
    assert.ok(isReviewCommand(body), body);
  for (const body of [
    '/reviewed, LGTM',
    '/review-please',
    'please /review',
    ' /review',
    '',
    undefined,
  ])
    assert.ok(!isReviewCommand(body), String(body));
});

test('a member, owner or collaborator can ask on a pull request', () => {
  for (const association of ['OWNER', 'MEMBER', 'COLLABORATOR'])
    assert.equal(reviewRequested(comment({ association })).run, true);
});

test('anyone else, an issue or another comment runs nothing', () => {
  for (const [input, reason] of [
    [comment({ association: 'CONTRIBUTOR' }), /no repository access/],
    [comment({ association: 'NONE' }), /no repository access/],
    [comment({ isPullRequest: false }), /not a pull request/],
    [comment({ body: '/reviewed' }), /not \/review/],
  ]) {
    const result = reviewRequested(input);
    assert.equal(result.run, false);
    assert.match(result.reason, reason);
  }
});
