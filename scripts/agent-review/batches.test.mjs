import test from 'node:test';
import assert from 'node:assert/strict';
import { planReview, executeReview, MAX_SUMMARY_BYTES } from './batches.mjs';
import { MAX_PROMPT_BYTES } from './lib.mjs';

function context(files = 2, lines = 65, width = 900) {
  const blocks = Array.from(
    { length: files },
    (_, file) =>
      `diff --git a/file${file}.ts b/file${file}.ts\nnew file mode 100644\n--- /dev/null\n+++ b/file${file}.ts\n@@ -0,0 +1,${lines} @@\n` +
      Array.from(
        { length: lines },
        (_, line) => `+unique_${file}_${line}_` + 'ž'.repeat(width) + '\n',
      ).join(''),
  );
  return {
    input: {
      issue: { number: 78, title: 'Task', body: 'Requirements' },
      prNumber: 12,
      prCount: 1,
      rules: [],
      diff: blocks.join(''),
    },
    meta: { changed_files: files, additions: files * lines, deletions: 0 },
    blocks,
  };
}
const answer = (
  verdict = 'pass',
  summary = 'Exports component props and consumes shared tokens.',
) => ({
  ok: true,
  stdout: JSON.stringify({
    verdict,
    findings:
      verdict === 'pass'
        ? []
        : [{ file: 'file0.ts', line: 1, issue: 'Contract mismatch' }],
    summary,
  }),
});

test('a small diff keeps one complete review without requiring summaries', async () => {
  const { input, meta } = context(1, 1, 1);
  const plan = planReview(input, meta);
  assert.equal(plan.crossFile, false);
  const result = await executeReview(plan, input, async () => ({
    ok: true,
    stdout: '{"verdict":"pass","findings":[]}',
  }));
  assert.equal(result.status, 'pass');
});
test('all original lines of large UTF-8 files occur in exactly one bounded batch', () => {
  const { input, meta } = context();
  const plan = planReview(input, meta);
  assert.equal(plan.crossFile, true);
  for (const prompt of plan.prompts)
    assert.ok(Buffer.byteLength(prompt) <= MAX_PROMPT_BYTES);
  for (let file = 0; file < 2; file++)
    for (let line = 0; line < 65; line++) {
      const token = `+unique_${file}_${line}_`;
      assert.equal(
        plan.prompts.reduce((n, p) => n + p.split(token).length - 1, 0),
        1,
        token,
      );
    }
});
test('whole files that fit are preserved rather than fragmented', () => {
  const { input, meta, blocks } = context(3, 35, 900);
  const plan = planReview(input, meta);
  for (const block of blocks)
    assert.equal(plan.prompts.filter((p) => p.includes(block)).length, 1);
});
test('partial or binary diffs are blocked before model calls', () => {
  const { input, meta } = context(1, 1, 1);
  assert.throws(
    () => planReview(input, { ...meta, changed_files: 2 }),
    /coverage/,
  );
  assert.throws(() => planReview(input, { ...meta, additions: 2 }), /coverage/);
  assert.throws(
    () =>
      planReview(
        { ...input, diff: input.diff + 'trailing unparsed text\n' },
        { ...meta, additions: 2 },
      ),
    /coverage/,
  );
  assert.throws(
    () =>
      planReview(
        {
          ...input,
          diff: 'diff --git a/image b/image\nBinary files a/image and b/image differ\n',
        },
        { ...meta, additions: 0 },
      ),
    /Binary/,
  );
});
test('oversized context, single lines and excessive batches fail closed', () => {
  const { input, meta } = context(1, 1, 1);
  assert.throws(
    () =>
      planReview(
        { ...input, rules: [{ name: 'rules', content: 'x'.repeat(100000) }] },
        meta,
      ),
    /budget/,
  );
  const giant = context(1, 1, 100000);
  assert.throws(() => planReview(giant.input, giant.meta), /single diff line/);
  const many = context(8, 45, 900);
  assert.throws(() => planReview(many.input, many.meta), /maximum/);
});
test('all batches plus the cross-file pass are required', async () => {
  const { input, meta } = context();
  const plan = planReview(input, meta);
  let count = 0;
  const result = await executeReview(plan, input, async (p) => {
    count++;
    assert.ok(Buffer.byteLength(p) <= MAX_PROMPT_BYTES);
    return answer();
  });
  assert.equal(count, plan.prompts.length + 1);
  assert.equal(result.status, 'pass');
  assert.match(result.coverage, /cross-file review: completed/);
});
test('a final pass cannot override findings in any batch', async () => {
  const { input, meta } = context();
  const plan = planReview(input, meta);
  let count = 0;
  const result = await executeReview(plan, input, async () =>
    answer(count++ === 0 ? 'findings' : 'pass'),
  );
  assert.equal(result.status, 'findings');
  assert.equal(count, plan.prompts.length + 1);
});
test('a failed batch or malformed summary never produces a partial pass', async () => {
  const { input, meta } = context();
  const plan = planReview(input, meta);
  for (const output of [
    { ok: false, reason: 'quota exhausted' },
    { ok: true, stdout: 'not JSON' },
    answer('pass', ''),
    answer('pass', 'x'.repeat(MAX_SUMMARY_BYTES + 1)),
  ]) {
    let count = 0;
    const result = await executeReview(plan, input, async () => {
      count++;
      return output;
    });
    assert.equal(result.status, 'error');
    assert.equal(count, 1);
  }
});
test('cross-file failure or findings block an otherwise clean diff', async () => {
  const { input, meta } = context();
  const plan = planReview(input, meta);
  for (const output of [{ ok: false, reason: 'timeout' }, answer('findings')]) {
    let count = 0;
    const result = await executeReview(plan, input, async () =>
      ++count > plan.prompts.length ? output : answer(),
    );
    assert.notEqual(result.status, 'pass');
    assert.equal(count, plan.prompts.length + 1);
  }
});

test('notes in any batch or the cross-file pass never block', async () => {
  const { input, meta } = context();
  const plan = planReview(input, meta);
  const noteOnly = () => ({
    ok: true,
    stdout: JSON.stringify({
      verdict: 'findings',
      findings: [{ severity: 'note', file: 'file0.ts', line: 1, issue: 'nit' }],
      summary: 'Exports component props and consumes shared tokens.',
    }),
  });
  const result = await executeReview(plan, input, async () => noteOnly());
  assert.equal(result.status, 'pass');
  assert.ok(result.findings.length > 0);
  assert.ok(result.findings.every((f) => f.severity === 'note'));
});

test('a blocker among notes still fails the review', async () => {
  const { input, meta } = context();
  const plan = planReview(input, meta);
  let count = 0;
  const result = await executeReview(plan, input, async () => ({
    ok: true,
    stdout: JSON.stringify({
      verdict: 'findings',
      findings: [
        { severity: 'note', file: 'file0.ts', line: 1, issue: 'nit' },
        ...(count++ === 1
          ? [{ severity: 'blocker', file: 'file1.ts', line: 2, issue: 'crash' }]
          : []),
      ],
      summary: 'Exports component props and consumes shared tokens.',
    }),
  }));
  assert.equal(result.status, 'findings');
});
