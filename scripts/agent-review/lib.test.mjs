import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildPrompt,
  decideIssue,
  findPriorResults,
  parseVerdict,
  prMarker,
} from './lib.mjs';

const SHA = 'a'.repeat(40);
const OTHER_SHA = 'b'.repeat(40);

const botComment = (marker, url = 'https://example.test/c') => ({
  user: { login: 'github-actions[bot]' },
  body: marker,
  html_url: url,
});

test('parseVerdict accepts a clean pass', () => {
  const v = parseVerdict('{"verdict":"pass","findings":[]}');
  assert.deepEqual(v, { ok: true, verdict: 'pass', findings: [] });
});

test('parseVerdict accepts findings, including fenced JSON', () => {
  const v = parseVerdict(
    '```json\n{"verdict":"findings","findings":[{"file":"a.ts","line":8,"issue":"off by one"}]}\n```',
  );
  assert.equal(v.ok, true);
  assert.equal(v.verdict, 'findings');
  assert.deepEqual(v.findings, [
    { file: 'a.ts', line: 8, issue: 'off by one' },
  ]);
});

test('parseVerdict rejects output that is not a verdict', () => {
  const quota =
    'Copilot was unable to review this pull request because the user who requested the review has reached their quota limit.';
  for (const bad of [
    '',
    quota,
    '{not json}',
    '{"verdict":"ok","findings":[]}',
  ]) {
    assert.equal(parseVerdict(bad).ok, false, bad);
  }
});

test('parseVerdict rejects inconsistent verdicts', () => {
  assert.equal(
    parseVerdict('{"verdict":"pass","findings":[{"issue":"x"}]}').ok,
    false,
  );
  assert.equal(parseVerdict('{"verdict":"findings","findings":[]}').ok, false);
  assert.equal(parseVerdict('{"verdict":"pass"}').ok, false);
});

test('findPriorResults only trusts bot comments for the exact commit', () => {
  const comments = [
    // forged by a human
    {
      user: { login: 'someone' },
      body: prMarker({ pr: 7, sha: SHA, result: 'pass', attempt: 1 }),
    },
    // result for an older commit
    botComment(prMarker({ pr: 7, sha: OTHER_SHA, result: 'pass', attempt: 1 })),
    // result for another PR
    botComment(prMarker({ pr: 8, sha: SHA, result: 'pass', attempt: 1 })),
  ];
  const prior = findPriorResults({ comments, pr: 7, sha: SHA });
  assert.equal(prior.final, null);
  assert.equal(prior.errorAttempts, 0);
});

test('findPriorResults returns the result and counts error attempts', () => {
  const comments = [
    botComment(prMarker({ pr: 7, sha: SHA, result: 'error', attempt: 1 })),
    botComment(prMarker({ pr: 7, sha: SHA, result: 'error', attempt: 2 })),
    botComment(
      prMarker({ pr: 7, sha: SHA, result: 'findings', attempt: 3 }),
      'u',
    ),
  ];
  const prior = findPriorResults({ comments, pr: 7, sha: SHA });
  assert.deepEqual(prior.final, { result: 'findings', url: 'u' });
  assert.equal(prior.errorAttempts, 2);
});

test('decideIssue passes only when every PR passed', () => {
  assert.equal(
    decideIssue([
      { pr: 1, status: 'pass' },
      { pr: 2, status: 'pass' },
    ]).outcome,
    'pass',
  );
  for (const status of ['findings', 'error', 'stale']) {
    const d = decideIssue([
      { pr: 1, status: 'pass' },
      { pr: 2, status },
    ]);
    assert.equal(d.outcome, 'blocked', status);
    assert.equal(d.reasons.length, 1);
  }
});

test('decideIssue blocks when no PR is linked', () => {
  const d = decideIssue([]);
  assert.equal(d.outcome, 'blocked');
  assert.match(d.reasons[0], /Closes #N/);
});

test('buildPrompt contains issue, rules and diff, and skips empty rules', () => {
  const prompt = buildPrompt({
    issue: { number: 78, title: 'Review agent', body: 'Podmínky dokončení' },
    prNumber: 97,
    prCount: 2,
    diff: 'diff --git a/x b/x',
    rules: [
      { name: 'CLAUDE.md', content: 'be nice' },
      { name: 'DESIGN.md', content: '  ' },
    ],
  });
  assert.match(prompt, /Issue #78: Review agent/);
  assert.match(prompt, /Podmínky dokončení/);
  assert.match(prompt, /### CLAUDE.md\nbe nice/);
  assert.doesNotMatch(prompt, /### DESIGN.md/);
  assert.match(prompt, /implemented by 2 pull requests/);
  assert.match(prompt, /diff --git a\/x b\/x/);
});
