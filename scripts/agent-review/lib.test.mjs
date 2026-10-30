import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildPrompt,
  decideIssue,
  formatIssueNote,
  findPriorResults,
  formatPrComment,
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
    { severity: 'blocker', file: 'a.ts', line: 8, issue: 'off by one' },
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

test('parseVerdict rejects unusable verdicts', () => {
  assert.equal(parseVerdict('{"verdict":"findings","findings":[]}').ok, false);
  assert.equal(parseVerdict('{"verdict":"pass"}').ok, false);
  assert.equal(
    parseVerdict('{"verdict":"pass","findings":[{"severity":"note"}]}').ok,
    false,
  );
});

test('notes alone never block, whatever verdict the agent states', () => {
  const finding = '{"severity":"note","file":"a.tsx","issue":"use a heading"}';
  for (const verdict of ['pass', 'findings']) {
    const v = parseVerdict(`{"verdict":"${verdict}","findings":[${finding}]}`);
    assert.equal(v.ok, true, verdict);
    assert.equal(v.verdict, 'pass', verdict);
    assert.equal(v.findings.length, 1);
  }
});

test('a blocker blocks even when the agent says pass', () => {
  const v = parseVerdict(
    '{"verdict":"pass","findings":[{"severity":"blocker","issue":"crashes"},{"severity":"note","issue":"nit"}]}',
  );
  assert.equal(v.verdict, 'findings');
});

test('a finding without an explicit severity is treated as a blocker', () => {
  for (const f of ['{"issue":"x"}', '{"severity":"minor","issue":"x"}']) {
    const v = parseVerdict(`{"verdict":"pass","findings":[${f}]}`);
    assert.equal(v.verdict, 'findings', f);
    assert.equal(v.findings[0].severity, 'blocker', f);
  }
});

test('the prompt tells the agent that only app-breaking defects block', () => {
  const prompt = buildPrompt({
    issue: { number: 1, title: 't', body: '' },
    prNumber: 2,
    prCount: 1,
    diff: 'd',
    rules: [],
  });
  assert.match(
    prompt,
    /"blocker": code that, as written, would actually break/,
  );
  assert.match(prompt, /"note": everything else/);
  assert.match(
    prompt,
    /Use "findings" only if at least one finding is a "blocker"/,
  );
});

test('formatPrComment shows notes on a pass without blocking sections', () => {
  const body = formatPrComment({
    sha: SHA,
    result: 'pass',
    findings: [
      { severity: 'note', file: 'a.tsx', line: 3, issue: 'use a heading' },
    ],
    attempt: 1,
    pr: 7,
    issue: 5,
  });
  assert.match(body, /result=pass/);
  assert.match(body, /bez blokujících nálezů/);
  assert.match(
    body,
    /Poznámky \(neblokují\):\*\*\n- `a.tsx:3` — use a heading/,
  );
  assert.doesNotMatch(body, /Blokující nálezy:/);
});

test('formatPrComment separates blockers from notes and bounds the list', () => {
  const notes = Array.from({ length: 25 }, (_, i) => ({
    severity: 'note',
    file: null,
    line: null,
    issue: `note ${i}`,
  }));
  const body = formatPrComment({
    sha: SHA,
    result: 'findings',
    findings: [
      { severity: 'blocker', file: 'b.ts', line: null, issue: 'crashes' },
      ...notes,
    ],
    attempt: 1,
    pr: 7,
    issue: 5,
  });
  assert.match(body, /Blokující nálezy:\*\*\n- `b.ts` — crashes/);
  assert.match(body, /Poznámky \(neblokují\)/);
  assert.match(body, /a dalších 5/);
  assert.equal(body.match(/note \d+/g).length, 20);
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
  assert.match(d.reasons[0], /Refs #N/);
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

test('formatIssueNote lists each PR once when blocked', () => {
  const results = [
    { pr: 1, sha: SHA, status: 'pass', url: 'u1' },
    { pr: 2, sha: OTHER_SHA, status: 'findings', url: 'u2' },
  ];
  const { reasons } = decideIssue(results);
  const note = formatIssueNote({
    issue: 5,
    state: 's',
    outcome: 'blocked',
    reasons,
    results,
    moved: false,
  });
  assert.equal(note.match(/PR #1/g).length, 1);
  assert.equal(note.match(/PR #2/g).length, 1);
});
