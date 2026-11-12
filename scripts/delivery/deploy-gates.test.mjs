import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (name) =>
  readFileSync(
    new URL(`../../.github/workflows/${name}`, import.meta.url),
    'utf8',
  );
const ci = read('ci.yml');
const deploy = read('deploy.yml');
const release = read('release.yml');

// The text of a top-level job, up to the next job or the end of the file.
function job(source, name) {
  const start = source.indexOf(`\n  ${name}:\n`);
  assert.notEqual(start, -1, `job ${name} is missing`);
  const rest = source.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[\w-]+:\n/);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

// The job's own `if:` condition, including a folded multi-line expression.
function condition(source, name) {
  const lines = job(source, name).split('\n');
  const start = lines.findIndex((line) => line.startsWith('    if:'));
  assert.notEqual(start, -1, `job ${name} has no if`);
  const body = [lines[start].slice('    if:'.length)];
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith('      ')) break;
    body.push(line);
  }
  return body.join(' ').replace(/\s+/g, ' ').trim();
}

// One step of a job, up to the next step.
function step(source, jobName, stepName) {
  const text = job(source, jobName);
  const start = text.indexOf(`      - name: ${stepName}\n`);
  assert.notEqual(start, -1, `step ${stepName} is missing`);
  const rest = text.slice(start);
  const next = rest.slice(1).search(/\n {6}- /);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

test('verify requires every CI lane and fails on skipped ones', () => {
  const verify = job(ci, 'verify');
  assert.ok(verify.includes('needs: [checks, database, stories, e2e]'));
  assert.equal(condition(ci, 'verify'), 'always()');
  assert.ok(verify.includes('if [ "$result" != success ]; then'));
  for (const lane of ['checks', 'database', 'stories', 'e2e'])
    assert.ok(verify.includes(`needs.${lane}.result`));
});

test('only E2E is skipped, and only for PRs into an integration branch', () => {
  assert.equal(
    condition(ci, 'e2e'),
    "${{ !startsWith(github.base_ref, 'integration/') }}",
  );
  for (const lane of ['checks', 'database', 'stories'])
    assert.ok(!/\n {4}if:/.test(job(ci, lane)));
});

const afterMainCi = [
  "github.event.workflow_run.conclusion == 'success'",
  "github.event.workflow_run.event == 'push'",
  "github.event.workflow_run.head_branch == 'main'",
].join(' && ');

test('release runs only after CI passed for a push to main', () => {
  assert.ok(release.includes('workflows: [CI]'));
  assert.ok(release.includes('branches: [main]'));
  assert.ok(!release.includes('workflow_dispatch'));
  assert.equal(condition(release, 'release'), `>- ${afterMainCi}`);
});

test('deploy runs after CI passed on main, or manually from main or a release tag', () => {
  assert.ok(deploy.includes('workflows: [CI]'));
  assert.ok(deploy.includes('branches: [main]'));
  assert.equal(
    condition(deploy, 'build-and-deploy'),
    ">- (github.event_name == 'workflow_dispatch' && " +
      "(github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/v'))) || " +
      `(github.event_name == 'workflow_run' && ${afterMainCi})`,
  );
});

test('a manual deploy first requires its commit on main with a passing verify', () => {
  const name = 'Require verify on main for a manual deploy';
  const guard = step(deploy, 'build-and-deploy', name);
  assert.ok(guard.includes("if: github.event_name == 'workflow_dispatch'\n"));
  assert.ok(!guard.includes('continue-on-error'));
  assert.ok(guard.includes('compare/main...$SHA'));
  assert.ok(
    guard.includes('"$status" != identical ] && [ "$status" != behind'),
  );
  assert.ok(guard.includes('check_name=verify'));
  assert.ok(guard.includes('.app.id == 15368 and .conclusion == "success"'));
  // It is the first step, so nothing is checked out, built or pushed before it.
  assert.ok(
    job(deploy, 'build-and-deploy').includes(
      `    steps:\n      - name: ${name}\n`,
    ),
  );
});
