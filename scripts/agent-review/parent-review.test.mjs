import assert from 'node:assert/strict';
import test from 'node:test';

import { parentReviewReasons } from './parent-review.mjs';

const repo = 'owner/repo';
const branch = 'integration/400-rooms';
const pr = (body) => ({
  body,
  base: { ref: 'main', repo: { full_name: repo } },
  head: { ref: branch, repo: { full_name: repo } },
});
const parent = {
  number: 400,
  branches: [],
  subIssues: [
    { state: 'CLOSED', stateReason: 'COMPLETED', labels: ['area:frontend'] },
    { state: 'CLOSED', stateReason: 'COMPLETED', labels: ['area:backend'] },
  ],
};

test('review handoff recognizes a parent PR closing its matching issue', () => {
  assert.deepEqual(
    parentReviewReasons({
      pr: pr('Closes #400'),
      issues: [parent],
      openInto: [],
    }),
    [],
  );
});

test('review handoff does not treat a Refs-only issue as parent ownership', () => {
  assert.match(
    parentReviewReasons({
      pr: pr('Refs #400'),
      issues: [parent],
      openInto: [],
    }).join(' '),
    /must link the one parent issue/,
  );
});
