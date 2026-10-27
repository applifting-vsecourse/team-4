import test from 'node:test';
import assert from 'node:assert/strict';
import { severityFor, sameSeverity, validateSeverity } from './severity.mjs';
import {
  evaluate,
  requirementsApproval,
  requirementsTransition,
  requirementsMarker,
  readyMarker,
} from './lib.mjs';
const sha = 'a'.repeat(40);
const pr = (level) => ({
  number: 12,
  head: { sha },
  user: { login: 'developer' },
  labels: level ? [{ name: `severity:${level}` }] : [],
  draft: false,
});
test('unlabelled PRs default to Standard; ambiguous and unknown severity fail closed', () => {
  assert.equal(severityFor(pr()), 'standard');
  assert.equal(severityFor(pr('high')), 'high');
  for (const labels of [
    [{ name: 'severity:low' }, { name: 'severity:high' }],
    [{ name: 'severity:typo' }],
  ]) {
    assert.throws(() => severityFor({ ...pr(), labels }));
    assert.equal(
      evaluate({
        pr: { ...pr(), labels },
        issues: [],
        reviews: [],
        comments: [],
      }).pass,
      false,
    );
  }
  assert.equal(sameSeverity(pr(), pr('standard')), true);
  assert.equal(sameSeverity(pr('standard'), pr('high')), false);
});
test('Low skips issue linkage, reviews and QA but never permits drafts', () => {
  const data = { pr: pr('low'), issues: [], reviews: [], comments: [] };
  assert.equal(evaluate(data).pass, true);
  data.pr.draft = true;
  assert.equal(evaluate(data).pass, false);
});
test('Low classification rejects executable code, config, renames and empty file coverage', () => {
  const low = pr('low');
  assert.equal(
    validateSeverity(low, [
      { filename: 'docs/readme.md' },
      { filename: 'apps/backend/src/example.test.ts' },
    ]),
    'low',
  );
  for (const files of [
    [],
    [{ filename: 'apps/backend/src/service.ts' }],
    [{ filename: 'package.json' }],
    [
      {
        filename: 'docs/readme.md',
        previous_filename: 'apps/backend/src/service.ts',
      },
    ],
  ])
    assert.throws(() => validateSeverity(low, files));
});
test('enforcement changes require High regardless of author or file extension', () => {
  for (const filename of [
    'CLAUDE.md',
    '.github/CODEOWNERS',
    'scripts/delivery/severity.mjs',
    'scripts/agent-review/lib.test.mjs',
    'scripts/automation/events.mjs',
    'docs/delivery-workflow.md',
  ]) {
    for (const level of ['low', 'standard'])
      assert.throws(() => validateSeverity(pr(level), [{ filename }]));
    assert.equal(validateSeverity(pr('high'), [{ filename }]), 'high');
  }
});
test('Standard enters code review without requirements but still needs linkage and current post-handoff QA', () => {
  const standard = pr();
  assert.equal(
    requirementsApproval({ ...standard, requirements: null }, []).id,
    'severity-standard',
  );
  assert.deepEqual(
    requirementsTransition('In Progress', [{ pr: standard, reviews: [] }]),
    { status: 'Ready for Code Review', review: true },
  );
  const bot = (body, second) => ({
    user: { login: 'github-actions[bot]' },
    body: body + '\n',
    created_at: `200${second}-01-01`,
  });
  const data = {
    pr: standard,
    issues: [{ number: 78, requirements: null }],
    reviews: [
      {
        id: 1,
        user: { login: 'MatejKrones' },
        state: 'APPROVED',
        commit_id: sha,
        submitted_at: '2004-01-01',
      },
    ],
    comments: [
      bot(requirementsMarker(12, sha, 78, 'severity-standard'), 1),
      bot(
        `<!-- agent-review-scope issue=78 -->\n<!-- agent-review pr=12 sha=${sha} result=pass attempt=1 -->`,
        2,
      ),
      bot(readyMarker(12, sha, 78), 3),
    ],
  };
  assert.equal(evaluate(data).pass, true);
  assert.equal(evaluate({ ...data, issues: [] }).pass, false);
  assert.equal(evaluate({ ...data, reviews: [] }).pass, false);
  assert.equal(
    evaluate({ ...data, pr: { ...standard, head: { sha: 'b'.repeat(40) } } })
      .pass,
    false,
  );
  assert.equal(evaluate({ ...data, pr: pr('high') }).pass, false);
});
