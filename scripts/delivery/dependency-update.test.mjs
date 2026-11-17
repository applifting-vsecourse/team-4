import test from 'node:test';
import assert from 'node:assert/strict';
import { isDependencyUpdate } from './dependency-update.mjs';

const repo = 'owner/repo';
const sha = 'b'.repeat(40);
const dependabot = (over = {}) => ({
  number: 40,
  head: { sha, ref: 'dependabot/npm_and_yarn/x', repo: { full_name: repo } },
  base: { ref: 'main' },
  user: { login: 'dependabot[bot]', type: 'Bot' },
  labels: [{ name: 'dependencies' }, { name: 'severity:standard' }],
  draft: false,
  ...over,
});

test('only a standard Dependabot update from this repository is a dependency update', () => {
  assert.equal(isDependencyUpdate(dependabot(), repo), true);
  const rejected = [
    { user: { login: 'developer', type: 'User' } },
    { user: { login: 'dependabot[bot]', type: 'User' } },
    { labels: [{ name: 'severity:standard' }] },
    { labels: [{ name: 'dependencies' }, { name: 'severity:high' }] },
    { labels: [{ name: 'dependencies' }, { name: 'severity:low' }] },
    {
      labels: [
        { name: 'dependencies' },
        { name: 'severity:standard' },
        { name: 'severity:high' },
      ],
    },
    { base: { ref: 'integration/1-x' } },
    { head: { sha, ref: 'x', repo: { full_name: 'fork/repo' } } },
  ];
  for (const over of rejected)
    assert.equal(isDependencyUpdate(dependabot(over), repo), false);
});
