import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

async function scenario(mode) {
  const sha = 'a'.repeat(40);
  const pr = {
    number: 12,
    state: 'open',
    base: { ref: 'main' },
    head: { sha },
    user: { login: 'developer' },
    labels: [{ name: 'severity:low' }],
    changed_files: 1,
    draft: mode === 'draft',
  };
  const statuses = [];
  globalThis.fetch = async (url, options = {}) => {
    const path = new URL(url).pathname;
    let data;
    if (path === '/repos/owner/repo/pulls') data = [pr];
    else if (path.endsWith('/pulls/12/files'))
      data =
        mode === 'partial'
          ? []
          : [
              {
                filename:
                  mode === 'code'
                    ? 'apps/backend/src/service.ts'
                    : 'docs/notes.md',
              },
            ];
    else if (path === '/repos/owner/repo/pulls/12')
      data = {
        ...pr,
        labels: [
          { name: mode === 'relabel' ? 'severity:standard' : 'severity:low' },
        ],
        head: { sha: mode === 'push' ? 'b'.repeat(40) : sha },
      };
    else if (path.includes('/check-runs')) data = { check_runs: [] };
    else if (path.includes('/statuses/')) {
      statuses.push(JSON.parse(options.body));
      data = {};
    } else
      throw new Error(
        'Low must not request review evidence or linked issues: ' + path,
      );
    return { ok: true, json: async () => data };
  };
  await import('./scripts/delivery/run.mjs');
  console.log(JSON.stringify({ statuses, exit: process.exitCode ?? 0 }));
  process.exitCode = 0;
}
function run(mode) {
  const output = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `await (${scenario.toString()})(${JSON.stringify(mode)})`,
    ],
    {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        GITHUB_EVENT_NAME: 'schedule',
        GITHUB_EVENT_PATH: '',
        GITHUB_REPOSITORY: 'owner/repo',
        GITHUB_TOKEN: 'mock',
        ONLY_ISSUE: '',
      },
    },
  );
  return JSON.parse(output.trim().split('\n').at(-1));
}
test('real delivery publisher passes Low without issue or review API reads', () => {
  const r = run('pass');
  assert.equal(r.exit, 0);
  assert.deepEqual(
    r.statuses.map((status) => status.state),
    ['pending', 'success'],
  );
});
for (const mode of ['code', 'partial', 'relabel', 'push', 'draft'])
  test(`real delivery publisher never passes Low on ${mode}`, () => {
    const r = run(mode);
    assert.ok(!r.statuses.some((status) => status.state === 'success'));
    assert.ok(['failure', 'error'].includes(r.statuses.at(-1).state));
  });
