import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FIRST_VERSION,
  latestVersion,
  nextVersion,
  releaseNotes,
} from './lib.mjs';

const sha = 'a'.repeat(40);
function notes(overrides = {}) {
  return releaseNotes({
    version: 'v0.1.4',
    sha,
    pr: { number: 120, title: 'feat: staging releases' },
    issues: [{ number: 75, title: '[S2-T2] Staging a automatické nasazení' }],
    message: 'Merge pull request #120',
    deployUrl: 'https://github.com/o/r/actions/workflows/deploy.yml',
    stageUrl: 'https://r.example.dev',
    generated: "## What's Changed\n* feat: staging releases",
    ...overrides,
  });
}

test('first release starts at the package version', () => {
  assert.equal(nextVersion([]), FIRST_VERSION);
  assert.equal(nextVersion(['nightly', 'v1.0']), FIRST_VERSION);
});

test('latest version compares numerically, not as text', () => {
  assert.equal(latestVersion(['v0.1.9', 'v0.1.10', 'v0.1.2']), 'v0.1.10');
  assert.equal(latestVersion(['v0.9.0', 'v1.0.0', 'v0.10.3']), 'v1.0.0');
});

test('every merge bumps the patch of the highest tag', () => {
  assert.equal(nextVersion(['v0.1.0', 'v0.1.1']), 'v0.1.2');
  assert.equal(nextVersion(['v0.1.7', 'v0.2.0']), 'v0.2.1');
});

test('notes list implemented issues and how to redeploy the version', () => {
  const body = notes();
  assert.match(
    body,
    /Implementuje:\n- #75 \[S2-T2\] Staging a automatické nasazení/,
  );
  assert.match(body, /Pull request: #120 feat: staging releases/);
  assert.match(
    body,
    /\[otevřít workflow Build & Deploy\]\(https:\/\/github\.com\/o\/r\/actions\/workflows\/deploy\.yml\)/,
  );
  assert.match(body, /vybrat `v0\.1\.4`/);
  assert.match(body, new RegExp(`Commit: ${sha}`));
  assert.ok(body.endsWith("## What's Changed\n* feat: staging releases"));
});

test('notes without linked issues still name the pull request', () => {
  const body = notes({ issues: [] });
  assert.doesNotMatch(body, /Implementuje/);
  assert.match(body, /Pull request: #120/);
});

test('direct pushes fall back to the commit subject', () => {
  const body = notes({ pr: null, issues: [], message: 'fix: hotfix\n\nbody' });
  assert.match(body, /Commit bez pull requestu: fix: hotfix$/m);
  assert.doesNotMatch(body, /Pull request:/);
});
