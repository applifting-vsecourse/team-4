import assert from 'node:assert/strict';
import test from 'node:test';
import { ciVerifyFailures } from './ci-verify.mjs';

const lanes = (overrides = {}) => ({
  baseRef: 'integration/319-roommate-wishes',
  checks: 'success',
  database: 'success',
  stories: 'success',
  e2e: 'skipped',
  ...overrides,
});

test('verify accepts the intentional E2E skip on integration PRs', () => {
  assert.deepEqual(ciVerifyFailures(lanes()), []);
});

test('verify still requires E2E outside integration branches', () => {
  for (const baseRef of ['main', '', 'integration/'])
    assert.deepEqual(ciVerifyFailures(lanes({ baseRef })), [
      'e2e lane finished with: skipped',
    ]);
});

test('verify rejects any other failed or skipped integration lane', () => {
  assert.deepEqual(ciVerifyFailures(lanes({ database: 'failure' })), [
    'database lane finished with: failure',
  ]);
  assert.deepEqual(ciVerifyFailures(lanes({ stories: 'skipped' })), [
    'stories lane finished with: skipped',
  ]);
});
