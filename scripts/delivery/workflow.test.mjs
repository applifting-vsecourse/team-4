import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync(
  new URL('../../.github/workflows/delivery-stages.yml', import.meta.url),
  'utf8',
);
const source = workflow
  .match(/<<'NODE'\n([\s\S]*?)\n          NODE/)[1]
  .replace(/^          /gm, '');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const verify = new AsyncFunction('process', 'fetch', 'console', source);

async function scenario(mode) {
  const sha = 'a'.repeat(40);
  const pr = { number: 140, state: 'open', head: { sha } };
  const legacy = {
    name: 'Delivery stages',
    head_sha: sha,
    app: { id: 15368 },
    external_id: '',
    status: 'completed',
    conclusion: 'success',
  };
  let reads = 0;
  const fetch = async (url) => {
    let data;
    if (url.includes('/pulls/140')) {
      reads++;
      data =
        mode === 'moved' && reads === 2
          ? { ...pr, head: { sha: 'b'.repeat(40) } }
          : pr;
    } else if (url.includes('/status?')) {
      data = { total_count: 0, statuses: [] };
      if (
        ['status', 'pending', 'forged-status', 'status-failed-check'].includes(
          mode,
        )
      ) {
        data.statuses = [
          {
            context: 'Delivery stages',
            state: mode === 'pending' ? 'pending' : 'success',
            creator: {
              login:
                mode === 'forged-status' ? 'other-user' : 'github-actions[bot]',
            },
          },
        ];
      }
    } else if (url.includes('/check-runs?')) {
      data = { total_count: 1, check_runs: [legacy] };
      if (mode === 'status' || mode === 'missing') data.check_runs = [];
      if (['failed', 'status-failed-check'].includes(mode))
        legacy.conclusion = 'failure';
      if (mode === 'running') legacy.status = 'in_progress';
      if (mode === 'self') legacy.external_id = 'real-actions-job';
      if (mode === 'other-app') legacy.app.id = 999;
    } else throw new Error('Unexpected API request');
    return { ok: mode !== 'api-error', status: 403, json: async () => data };
  };
  return verify(
    {
      env: {
        GITHUB_REPOSITORY: 'owner/repo',
        GITHUB_TOKEN: 'mock',
        PR_SHA: sha,
        PR_NUMBER: '140',
      },
    },
    fetch,
    { log() {} },
  );
}

test('only PR events expose the required native job, running trusted main code', () => {
  assert.ok(
    workflow.includes(
      "name: ${{ github.event.pull_request.number && 'Delivery stages' || 'Reconcile delivery stages' }}",
    ),
  );
  assert.ok(workflow.includes('ref: main'));
  assert.ok(
    workflow.indexOf('node scripts/delivery/run.mjs') <
      workflow.indexOf('Require the evaluated verdict'),
  );
});

for (const mode of ['legacy', 'status']) {
  test(`native job accepts the evaluated ${mode} verdict`, () =>
    scenario(mode));
}
for (const mode of [
  'pending',
  'forged-status',
  'missing',
  'failed',
  'status-failed-check',
  'running',
  'self',
  'other-app',
  'moved',
  'api-error',
]) {
  test(`native job blocks ${mode} evidence`, () =>
    assert.rejects(scenario(mode)));
}
