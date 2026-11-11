import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

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

test('merged child PRs close their sub-issue with trusted code from main only', () => {
  const merge = readFileSync(
    new URL('../../.github/workflows/integration-merge.yml', import.meta.url),
    'utf8',
  );
  assert.ok(merge.includes('pull_request_target:'));
  assert.ok(merge.includes('types: [closed]'));
  assert.ok(merge.includes("branches: ['integration/**']"));
  assert.ok(merge.includes('if: github.event.pull_request.merged == true'));
  assert.ok(merge.includes('ref: main'));
  assert.ok(merge.includes('persist-credentials: false'));
  assert.ok(merge.includes('node scripts/delivery/close-child.mjs'));
  // Nothing from the merged PR is checked out, installed or run.
  assert.ok(!merge.includes('github.event.pull_request.head'));
  assert.ok(!merge.includes('pnpm install'));
  assert.ok(!/contents: write|pull-requests: write/.test(merge));
});
