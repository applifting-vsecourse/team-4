import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { STACK_MERGERS } from './stack-merge-command.mjs';

const workflow = readFileSync(
  new URL('../../.github/workflows/delivery-stages.yml', import.meta.url),
  'utf8',
);
const review = readFileSync(
  new URL('../../.github/workflows/agent-code-review.yml', import.meta.url),
  'utf8',
);

test('only the evaluator publishes Delivery stages; native jobs cannot leave a second required verdict', () => {
  assert.ok(workflow.includes('name: Reconcile delivery stages'));
  assert.ok(!workflow.includes("'Delivery stages'"));
  assert.ok(!workflow.includes('Require the evaluated verdict'));
  assert.ok(workflow.includes('ref: main'));
});

test('review reconciles its own scoped verdict even after errors, but never on dry runs', () => {
  assert.ok(!workflow.includes('workflow_run:'));
  assert.ok(
    review.includes(
      "if: always() && (github.event_name != 'workflow_dispatch' || !inputs.dry_run)",
    ),
  );
  assert.ok(review.includes('node scripts/delivery/run.mjs'));
  assert.ok(review.includes('ref: main'));
});

test('stacked PR events are received by both workflows', () => {
  assert.ok(!workflow.includes('branches: [main]'));
  assert.ok(!review.includes('branches: [main]'));
});

test('both workflows reconcile severity label additions and removals', () => {
  for (const source of [workflow, review]) {
    assert.ok(source.includes('        labeled,'));
    assert.ok(source.includes('        unlabeled,'));
  }
});

const stackMerge = readFileSync(
  new URL('../../.github/workflows/stack-merge.yml', import.meta.url),
  'utf8',
);

test('the stack merge workflow only reacts to new /merge-stack comments on PRs', () => {
  assert.match(stackMerge, /issue_comment:\s*\n\s*types: \[created\]/);
  assert.match(stackMerge, /github\.event\.issue\.pull_request/);
  assert.match(
    stackMerge,
    /startsWith\(github\.event\.comment\.body, '\/merge-stack'\)/,
  );
});

test('the stack merge workflow never runs PR code and merges with its own token', () => {
  assert.match(stackMerge, /ref: main/);
  assert.match(stackMerge, /persist-credentials: false/);
  assert.match(
    stackMerge,
    /PROJECT_AUTOMATION_TOKEN: \$\{\{ secrets\.PROJECT_AUTOMATION_TOKEN \}\}/,
  );
  assert.match(stackMerge, /contents: read/);
  assert.doesNotMatch(stackMerge, /contents: write/);
  // The reply is a comment on a PR: the workflow token needs pull-requests write.
  assert.match(stackMerge, /^\s*pull-requests: write\s*$/m);
  assert.match(stackMerge, /cancel-in-progress: false/);
  // The comment body must never be interpolated into a shell command.
  assert.doesNotMatch(stackMerge, /run:.*\$\{\{\s*github\.event/);
});

test('only the people the script allows can even start a stack merge run', () => {
  // A stranger's comment would otherwise queue a run and could push a
  // maintainer's pending command out of the single-slot concurrency queue.
  const allowed = /fromJSON\('(\[[^']+\])'\)/.exec(stackMerge)?.[1];
  assert.deepEqual(
    JSON.parse(allowed)
      .map((login) => login.toLowerCase())
      .sort(),
    STACK_MERGERS.map((login) => login.toLowerCase()).sort(),
  );
  assert.match(stackMerge, /comment\.user\.type == 'User'/);
});
