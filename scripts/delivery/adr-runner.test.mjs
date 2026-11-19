import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// A Low PR that adds ADR-0001 (or only a note), judged by the real runner.
async function scenario(mode) {
  const sha = 'a'.repeat(40);
  const reviewed = 'b'.repeat(40);
  const adr = 'docs/adr/0001-feature-integration-branches.md';
  const pr = {
    number: 12,
    state: 'open',
    base: { ref: 'main' },
    head: { sha },
    user: { login: 'developer' },
    labels: [{ name: 'severity:low' }],
    changed_files: 1,
    draft: false,
  };
  const status =
    mode === 'proposed' ? 'Proposed' : 'Accepted 2026-11-13 in #12';
  const listings = {
    [sha]: [{ path: adr, sha: 'blob-head', type: 'file' }],
    [reviewed]: [
      {
        path: adr,
        sha: mode === 'edited' ? 'blob-old' : 'blob-head',
        type: 'file',
      },
    ],
    main: [],
  };
  const blob = (text) => ({
    encoding: 'base64',
    content: Buffer.from(text).toString('base64'),
  });
  const statuses = [];
  globalThis.fetch = async (url, options = {}) => {
    const { pathname: path, searchParams } = new URL(url);
    let data;
    if (path === '/repos/owner/repo/pulls') data = [pr];
    else if (path.endsWith('/pulls/12/files'))
      data = [
        {
          filename: mode === 'no-adr' ? 'docs/notes.md' : adr,
          status: 'added',
        },
      ];
    else if (path === '/repos/owner/repo/pulls/12') data = pr;
    else if (path.endsWith('/pulls/12/reviews')) {
      if (mode === 'no-adr')
        throw new Error('Low without ADR changes must not read reviews');
      data =
        mode === 'no-review'
          ? []
          : [
              {
                id: 1,
                state: 'COMMENTED',
                user: { login: 'rmnskb' },
                body: '/adr-accept 0001',
                commit_id: reviewed,
              },
            ];
    } else if (path === '/repos/owner/repo/contents/docs/adr') {
      if (mode === 'api-error') return { ok: false, status: 500 };
      data = listings[searchParams.get('ref')];
      if (!data) return { ok: false, status: 404 };
    } else if (path === '/repos/owner/repo/git/blobs/blob-head')
      data = blob(`# ADR-0001\n\n- **Status:** ${status}\n`);
    else if (path.endsWith('/timeline')) data = [];
    else if (path.includes('/check-runs')) data = { check_runs: [] };
    else if (path.includes('/statuses/')) {
      statuses.push(JSON.parse(options.body));
      data = {};
    } else throw new Error('Unexpected request: ' + path);
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

for (const mode of ['accepted', 'no-adr'])
  test(`a Low PR passes: ${mode}`, () => {
    const r = run(mode);
    assert.equal(r.exit, 0);
    assert.deepEqual(
      r.statuses.map((s) => s.state),
      ['pending', 'success'],
    );
  });

test('an unreadable ADR listing fails closed', () => {
  const r = run('api-error');
  assert.equal(r.exit, 1);
  assert.equal(r.statuses.at(-1).state, 'error');
});

for (const [mode, reason] of [
  [
    'no-review',
    /needs a Comment review "\/adr-accept 0001" by @rmnskb or @darebakdavca/,
  ],
  [
    'edited',
    /needs a Comment review "\/adr-accept 0001" by @rmnskb or @darebakdavca/,
  ],
  ['proposed', /ADR-0001 is still Proposed/],
])
  test(`a Low ADR PR is blocked: ${mode}`, () => {
    const r = run(mode);
    assert.equal(r.statuses.at(-1).state, 'failure');
    assert.match(r.statuses.at(-1).description, reason);
  });
