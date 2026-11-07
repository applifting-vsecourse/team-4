import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleCommand, parseCommand } from './stack-merge-command.mjs';
import { repo } from './stack-fake.mjs';

// Reads and replies go through `api` (the workflow token), merges and retargets
// through `write` (PROJECT_AUTOMATION_TOKEN). The fake records which was used.
function setup({
  body = '/merge-stack',
  user = 'MatejKrones',
  type = 'User',
  number = 2,
  ...options
} = {}) {
  const fake = repo(options);
  const writes = [];
  const replies = [];
  const comment = {
    id: 7,
    body,
    user: { login: user, type },
    issue_url: `https://api.github.com/repos/o/r/issues/${number}`,
  };
  const api = async (path, opts = {}) => {
    if (path === '/repos/o/r/issues/comments/7') return comment;
    assert.equal(
      opts.method ?? 'GET',
      'GET',
      `the workflow token must only read: ${path}`,
    );
    return fake.api(path, opts);
  };
  const write = async (path, opts) => {
    writes.push([opts.method, path]);
    return fake.api(path, opts);
  };
  const run = (extra = {}) =>
    handleCommand({
      api,
      write,
      repo: 'o/r',
      event: {
        issue: { number, pull_request: {} },
        comment: { id: 7 },
      },
      post: async (text) => replies.push(text),
      wait: async () => {},
      log: () => {},
      ...extra,
    });
  return { run, writes, replies, fake, comment };
}

test('only /merge-stack and /merge-stack check are commands', () => {
  assert.deepEqual(parseCommand('/merge-stack'), { check: false });
  assert.deepEqual(parseCommand('  /merge-stack check\n'), { check: true });
  for (const body of [
    '',
    'please /merge-stack',
    '/merge-stack now',
    '/merge-stacks',
    '/merge-stack check please',
    undefined,
  ])
    assert.equal(parseCommand(body), null, String(body));
});

test('merges the stack through the merge token and replies once', async () => {
  const { run, writes, replies } = setup();
  const result = await run();
  assert.deepEqual(result, { outcome: 'merged', merged: [1, 2, 3] });
  assert.deepEqual(
    writes.map(
      ([method, path]) => `${method} ${path.replace('/repos/o/r', '')}`,
    ),
    [
      'PUT /pulls/1/merge',
      'PATCH /pulls/2',
      'PUT /pulls/2/merge',
      'PATCH /pulls/3',
      'PUT /pulls/3/merge',
    ],
  );
  assert.equal(replies.length, 1);
  assert.match(replies[0], /<!-- stack-merge pr=2 result=merged -->/);
  assert.match(replies[0], /#1 → #2 → #3/);
});

test('check reports readiness and writes nothing', async () => {
  const { run, writes, replies } = setup({ body: '/merge-stack check' });
  assert.equal((await run()).outcome, 'checked');
  assert.deepEqual(writes, []);
  assert.match(replies[0], /Ready to merge.*#1 → #2 → #3/s);
});

test('check works without a merge token, a merge does not', async () => {
  const check = setup({ body: '/merge-stack check' });
  assert.equal((await check.run({ write: undefined })).outcome, 'checked');
  const merge = setup();
  assert.equal((await merge.run({ write: undefined })).outcome, 'failed');
  assert.match(
    merge.replies[0],
    /`PROJECT_AUTOMATION_TOKEN` is not configured/,
  );
  assert.deepEqual(merge.writes, []);
});

test('only the three named people can merge a stack', async () => {
  for (const user of ['darebakdavca', 'rmnskb', 'MatejKrones']) {
    const { run } = setup({ user });
    assert.equal((await run()).outcome, 'merged', user);
  }
  const stranger = setup({ user: 'someone-else' });
  assert.equal((await stranger.run()).outcome, 'denied');
  assert.deepEqual(stranger.writes, []);
  assert.match(
    stranger.replies[0],
    /Only @darebakdavca, @rmnskb, @MatejKrones can use/,
  );
  const bot = setup({ user: 'MatejKrones', type: 'Bot' });
  assert.equal((await bot.run()).outcome, 'denied');
});

test('the command is read back live: an edited comment is not a command', async () => {
  const { run, writes, replies, comment } = setup();
  comment.body = 'actually, never mind';
  assert.equal((await run()).outcome, 'ignored');
  assert.deepEqual([writes, replies], [[], []]);
});

test('a comment on a different issue than the event claims is ignored', async () => {
  const { run, comment } = setup();
  comment.issue_url = 'https://api.github.com/repos/o/r/issues/99';
  assert.equal((await run()).outcome, 'ignored');
});

test('comments on plain issues are ignored', async () => {
  const { run } = setup();
  const result = await run({
    event: { issue: { number: 2 }, comment: { id: 7 } },
  });
  assert.equal(result.outcome, 'ignored');
});

test('a stack which is not ready is refused with reasons and nothing merges', async () => {
  const { run, writes, replies } = setup({ status: { 2: 'failure' } });
  assert.equal((await run()).outcome, 'refused');
  assert.deepEqual(writes, []);
  assert.match(replies[0], /Nothing was merged/);
  assert.match(replies[0], /#2: Delivery stages is failure/);
});

test('a lone PR is not a stack', async () => {
  const { run, writes, replies } = setup({ count: 1, number: 1 });
  assert.equal((await run()).outcome, 'refused');
  assert.deepEqual(writes, []);
  assert.match(replies[0], /not part of a stack/);
});

test('a merge which stops part way is reported as failed with what merged', async () => {
  const { run, replies } = setup({ failMerge: 2 });
  assert.equal((await run()).outcome, 'failed');
  assert.match(replies[0], /stopped part way/);
  assert.match(replies[0], /merged so far: #1/);
});
