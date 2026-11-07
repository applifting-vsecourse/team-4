import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildStacks,
  carriesOver,
  inSync,
  outOfSync,
  outOfSyncNote,
  resumableBase,
  sliceFingerprint,
} from './stack.mjs';

const pr = (number, head, base, sha = String(number).padStart(40, '0')) => ({
  number,
  state: 'open',
  head: { ref: head, sha },
  base: { ref: base },
});

test('a chain of PRs is one stack, bottom to top', () => {
  const { stacks, problems } = buildStacks([
    pr(3, 'c', 'b'),
    pr(1, 'a', 'main'),
    pr(2, 'b', 'a'),
  ]);
  assert.deepEqual(problems, []);
  assert.equal(stacks.length, 1);
  assert.deepEqual(
    stacks[0].prs.map((p) => p.number),
    [1, 2, 3],
  );
  assert.equal(stacks[0].tip.number, 3);
  assert.equal(stacks[0].bottom.number, 1);
});

test('independent PRs are stacks of one', () => {
  const { stacks } = buildStacks([pr(1, 'a', 'main'), pr(2, 'b', 'main')]);
  assert.deepEqual(
    stacks.map((s) => s.prs.length),
    [1, 1],
  );
});

test('two PRs on one base are reported, not stacked', () => {
  const { stacks, problems } = buildStacks([
    pr(1, 'a', 'main'),
    pr(2, 'b', 'a'),
    pr(3, 'c', 'a'),
  ]);
  assert.equal(stacks.length, 0);
  assert.equal(problems.length, 1);
  assert.match(problems[0].reason, /#1 has several PRs/);
});

test('a cycle is reported', () => {
  const { stacks, problems } = buildStacks([pr(1, 'a', 'b'), pr(2, 'b', 'a')]);
  assert.equal(stacks.length, 0);
  assert.ok(problems.some((p) => /cycle/.test(p.reason)));
});

test('closed PRs and forks do not join a stack', () => {
  const closed = { ...pr(2, 'b', 'a'), state: 'closed' };
  const fork = {
    ...pr(3, 'c', 'a'),
    head: { ref: 'c', sha: 'x', repo: { full_name: 'someone/team-4' } },
    base: { ref: 'a', repo: { full_name: 'org/team-4' } },
  };
  const { stacks } = buildStacks([pr(1, 'a', 'main'), closed, fork]);
  assert.deepEqual(
    stacks.map((s) => s.prs.map((p) => p.number)),
    [[1], [3]],
  );
});

test('a PR from a deleted fork never joins a stack', () => {
  const ghost = {
    ...pr(2, 'b', 'a'),
    head: { ref: 'b', sha: 'x', repo: null },
  };
  const { stacks } = buildStacks([pr(1, 'a', 'main'), ghost]);
  assert.deepEqual(
    stacks.map((s) => s.prs.map((p) => p.number)),
    [[1], [2]],
  );
});

test('inSync accepts ahead and identical only', () => {
  assert.ok(inSync('ahead'));
  assert.ok(inSync('identical'));
  assert.ok(!inSync('behind'));
  assert.ok(!inSync('diverged'));
});

test('outOfSync names the PR that lacks its parent', async () => {
  const [a, b, c] = [pr(1, 'a', 'main'), pr(2, 'b', 'a'), pr(3, 'c', 'b')];
  const stack = buildStacks([a, b, c]).stacks[0];
  const behind = await outOfSync(stack, async (parent) =>
    parent === a.head.sha ? 'diverged' : 'ahead',
  );
  assert.deepEqual(
    behind.map((x) => [x.pr.number, x.parent.number]),
    [[2, 1]],
  );
  assert.match(outOfSyncNote(behind[0]), /Merge `a` into `b`/);
});

const file = (path, ...body) =>
  [`diff --git a/${path} b/${path}`, 'index 111..222 100644', ...body].join(
    '\n',
  );
const hunk = (path, ...lines) =>
  file(path, `--- a/${path}`, `+++ b/${path}`, '@@ -1,3 +1,4 @@ fn', ...lines);

test('the fingerprint ignores line numbers, the hunk heading and blob ids', () => {
  const before = hunk('x.ts', ' keep', '+const a = 1;', '-old');
  const after = file(
    'x.ts',
    '--- a/x.ts',
    '+++ b/x.ts',
    '@@ -40,3 +44,4 @@ other function',
    ' keep',
    '+const a = 1;',
    '-old',
  ).replace('111..222', '333..444');
  assert.equal(sliceFingerprint(before), sliceFingerprint(after));
});

test('the fingerprint changes with the PR own edits and ignores file order', () => {
  const x = hunk('x.ts', '+one');
  const y = hunk('y.ts', '+two');
  assert.equal(sliceFingerprint(x + '\n' + y), sliceFingerprint(y + '\n' + x));
  assert.notEqual(
    sliceFingerprint(x),
    sliceFingerprint(hunk('x.ts', '+changed')),
  );
  assert.notEqual(sliceFingerprint(x), sliceFingerprint(hunk('z.ts', '+one')));
  assert.equal(sliceFingerprint(''), sliceFingerprint(undefined));
});

test('added and removed lines which look like diff headers still count', () => {
  const base = hunk('x.ts', '+foo');
  assert.notEqual(
    sliceFingerprint(base),
    sliceFingerprint(hunk('x.ts', '+foo', '+++i;')),
  );
  assert.notEqual(
    sliceFingerprint(base),
    sliceFingerprint(hunk('x.ts', '+foo', '--- DROP')),
  );
  assert.notEqual(
    sliceFingerprint(hunk('x.sql', '-- guard', '+select 1;')),
    sliceFingerprint(hunk('x.sql', '+select 1;')),
  );
});

test('moving a line, changing its context or its whitespace changes the fingerprint', () => {
  const original = hunk('x.ts', ' if (ok) {', '+  auth();', ' }');
  assert.notEqual(
    sliceFingerprint(original),
    sliceFingerprint(hunk('x.ts', ' if (ok) {', ' }', '+  auth();')),
  );
  assert.notEqual(
    sliceFingerprint(original),
    sliceFingerprint(hunk('x.ts', ' if (other) {', '+  auth();', ' }')),
  );
  assert.notEqual(
    sliceFingerprint(original),
    sliceFingerprint(hunk('x.ts', ' if (ok) {', '+    auth();', ' }')),
  );
});

test('a file mode or rename change changes the fingerprint', () => {
  const plain = hunk('x.sh', '+echo hi');
  const exec = plain.replace(
    'index 111..222 100644',
    'old mode 100644\nnew mode 100755\nindex 111..222',
  );
  assert.notEqual(sliceFingerprint(plain), sliceFingerprint(exec));
  const renamed = plain.replace(
    'index 111..222 100644',
    'rename from old.sh\nrename to x.sh\nindex 111..222',
  );
  assert.notEqual(sliceFingerprint(plain), sliceFingerprint(renamed));
});

test('binary files are fingerprinted by their blob', () => {
  const bin = (blob) =>
    [
      'diff --git a/a.png b/a.png',
      `index 111..${blob} 100644`,
      'Binary files a/a.png and b/a.png differ',
    ].join('\n');
  assert.equal(sliceFingerprint(bin('aaa')), sliceFingerprint(bin('aaa')));
  assert.notEqual(sliceFingerprint(bin('aaa')), sliceFingerprint(bin('bbb')));
});

test('a review carries over only for the same slice on a descendant head', () => {
  assert.ok(
    carriesOver({ previousSlice: 'f', currentSlice: 'f', status: 'ahead' }),
  );
  assert.ok(
    !carriesOver({ previousSlice: 'f', currentSlice: 'g', status: 'ahead' }),
  );
  assert.ok(
    !carriesOver({ previousSlice: 'f', currentSlice: 'f', status: 'diverged' }),
  );
  assert.ok(
    !carriesOver({ previousSlice: '', currentSlice: '', status: 'ahead' }),
  );
});

test('a stack has one author, so one QA owner covers it', () => {
  const by = (login, p) => ({ ...p, user: { login } });
  const { stacks, problems } = buildStacks([
    by('MatejKrones', pr(1, 'a', 'main')),
    by('MatejKrones', pr(2, 'b', 'a')),
    by('darebakdavca', pr(3, 'c', 'b')),
  ]);
  assert.equal(stacks.length, 0);
  assert.match(problems[0].reason, /#3 has a different author than #1/);
  const same = buildStacks([
    by('MatejKrones', pr(1, 'a', 'main')),
    by('matejkrones', pr(2, 'b', 'a')),
  ]);
  assert.equal(same.stacks[0].prs.length, 2);
});

test('a base is resumable only when a merged PR of that branch is in the head', async () => {
  const bottom = (base) => ({ base: { ref: base }, head: { sha: 'h' } });
  const merged = { merged_at: '2026-11-06T00:00:00Z', head: { sha: 'm' } };
  const run = (b, closed, status) =>
    resumableBase({
      list: async () => closed,
      compare: async () => status,
      repo: 'o/r',
      bottom: b,
    });
  assert.equal(await run(bottom('main'), [merged], 'ahead'), false);
  assert.equal(await run(bottom('b1'), [merged], 'ahead'), true);
  assert.equal(await run(bottom('b1'), [merged], 'identical'), true);
  assert.equal(await run(bottom('b1'), [merged], 'diverged'), false);
  assert.equal(
    await run(bottom('b1'), [{ head: { sha: 'm' } }], 'ahead'),
    false,
  );
  assert.equal(await run(bottom('b1'), [], 'ahead'), false);
});
