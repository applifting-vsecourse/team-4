import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildPrompt,
  formatReviewComment,
  parseVerdict,
  selectRules,
} from './prompt.mjs';

const SHA = 'a'.repeat(40);

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

test('buildPrompt contains issue, rules and diff, and skips empty rules', () => {
  const prompt = buildPrompt({
    issue: { number: 78, title: 'Review agent', body: 'Podmínky dokončení' },
    prNumber: 97,
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
  assert.match(prompt, /Judge only the changes and declared scope of PR #97/);
  assert.match(prompt, /diff --git a\/x b\/x/);
});

test('selectRules keeps review sections, gates DESIGN.md on frontend, summarises CI', async () => {
  const rules = [
    {
      name: 'CLAUDE.md',
      content:
        '# A\nintro\n\n## UI rules\nuse tokens\n\n## Delivery\nsecret process\n',
    },
    { name: 'DESIGN.md', content: 'design' },
    { name: '.github/workflows/ci.yml', content: 'name: ci\n'.repeat(500) },
  ];
  const be = selectRules(
    rules,
    'diff --git a/apps/backend/x.ts b/apps/backend/x.ts',
  );
  assert.deepEqual(
    be.map((r) => r.name),
    ['CLAUDE.md', 'CI'],
  );
  assert.match(be[0].content, /use tokens/);
  assert.doesNotMatch(be[0].content, /secret process/);
  const fe = selectRules(
    rules,
    'diff --git a/apps/frontend/x.ts b/apps/frontend/x.ts',
  );
  assert.ok(fe.some((r) => r.name === 'DESIGN.md'));
});

test('a PR without a linked issue is judged by its own description', () => {
  const prompt = buildPrompt({
    pullRequest: { title: 'Fix', body: 'What: x' },
    prNumber: 5,
    diff: 'diff --git a/x b/x',
    rules: [],
  });
  assert.match(prompt, /links no issue/);
  assert.doesNotMatch(prompt, /Issue #undefined/);
});

test('the comment names the commit and who asked, and never claims to block', () => {
  const body = formatReviewComment({
    sha: SHA,
    result: 'pass',
    findings: [
      { severity: 'note', file: 'a.tsx', line: 3, issue: 'use a heading' },
    ],
    requestedBy: 'rmnskb',
  });
  assert.match(body, /bez blokujících nálezů/);
  assert.match(body, /`aaaaaaa`/);
  assert.match(body, /@rmnskb/);
  assert.match(body, /- `a.tsx:3` — use a heading/);
  assert.match(body, /merge neblokuje/);
});

test('possible breakages are listed apart from notes, and the list is bounded', () => {
  const notes = Array.from({ length: 25 }, (_, i) => ({
    severity: 'note',
    file: null,
    line: null,
    issue: `note ${i}`,
  }));
  const body = formatReviewComment({
    sha: SHA,
    result: 'findings',
    findings: [
      { severity: 'blocker', file: 'b.ts', line: null, issue: 'crashes' },
      ...notes,
    ],
    requestedBy: 'rmnskb',
  });
  assert.match(body, /Možné chyby[^\n]*\n- `b.ts` — crashes/);
  assert.match(body, /Poznámky \(25\)/);
  assert.match(body, /a dalších 5/);
  assert.equal(body.match(/note \d+/g).length, 20);
});

test('a failed review says why and asks for a new /review', () => {
  const body = formatReviewComment({
    sha: SHA,
    result: 'error',
    reason: 'Copilot CLI selhalo: vypršel časový limit',
    requestedBy: 'rmnskb',
  });
  assert.match(body, /nedokončeno/);
  assert.match(body, /vypršel časový limit/);
  assert.match(body, /`\/review`/);
});
