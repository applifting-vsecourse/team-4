import test from 'node:test';
import assert from 'node:assert/strict';
import { ciEvidence } from './ci-evidence.mjs';
import { buildPrompt } from './lib.mjs';

const sha = 'a'.repeat(40);
const base = {
  id: 1,
  head_sha: sha,
  event: 'pull_request',
  path: '.github/workflows/ci.yml',
  repository: { full_name: 'owner/repo' },
  pull_requests: [{ number: 12 }],
  run_attempt: 2,
  html_url: 'https://github.com/owner/repo/actions/runs/1',
  status: 'completed',
  conclusion: 'success',
};
async function evidence(runs, jobs = []) {
  return ciEvidence({
    repo: 'owner/repo',
    pr: 12,
    sha,
    get: async (path) => {
      if (path.includes('/actions/runs?')) return { workflow_runs: runs };
      assert.ok(path.includes('/attempts/2/jobs?'));
      return { jobs };
    },
  });
}

test('CI evidence uses the exact SHA, PR, workflow, repository and latest run', async () => {
  for (const other of [
    { head_sha: 'b'.repeat(40) },
    { event: 'push' },
    { path: '.github/workflows/other.yml' },
    { repository: { full_name: 'other/repo' } },
    { pull_requests: [{ number: 99 }] },
  ])
    assert.equal(
      (await evidence([{ ...base, ...other }])).status,
      'unavailable',
    );
  const result = await evidence([
    base,
    { ...base, id: 2, status: 'in_progress', conclusion: null },
  ]);
  assert.equal(result.status, 'in_progress');
  assert.equal(result.conclusion, null);
});

test('only recognised steps from matching verify jobs are supplied; no logs', async () => {
  const step = {
    name: 'Apply migrations to clean database',
    status: 'completed',
    conclusion: 'success',
    log: 'untrusted log',
  };
  const result = await evidence(
    [base],
    [
      {
        name: 'verify',
        head_sha: sha,
        steps: [step, { ...step, name: 'arbitrary instructions' }],
      },
      { name: 'verify', head_sha: 'b'.repeat(40), steps: [step] },
    ],
  );
  assert.deepEqual(result.steps, [
    { name: step.name, status: 'completed', conclusion: 'success' },
  ]);
  assert.ok(!JSON.stringify(result).includes('untrusted log'));
});

test('API errors cannot be converted to successful CI evidence', async () => {
  await assert.rejects(
    ciEvidence({
      repo: 'owner/repo',
      pr: 12,
      sha,
      get: async () => {
        throw new Error('API unavailable');
      },
    }),
  );
});

test('review prompt distinguishes CI execution evidence from untested runtime cases', () => {
  const prompt = buildPrompt({
    issue: { number: 1 },
    prNumber: 12,
    prCount: 1,
    diff: '',
    rules: [],
    ciEvidence: { sha, status: 'completed', conclusion: 'success' },
  });
  assert.ok(prompt.includes(sha));
  assert.match(prompt, /Passing clean-database/);
  assert.match(prompt, /different, untested scenario/);
});
