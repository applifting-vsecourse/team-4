import assert from 'node:assert/strict';
import test from 'node:test';
import { automaticMergeTreeSha, fetchMergeHistory } from './merge-tree.mjs';

test('sync verification unshallows history and authenticates the ref fetch', () => {
  const invocations = [];
  fetchMergeHistory({
    baseRef: 'integration/26-room-proposals',
    token: 'test-token',
    exec: (...args) => {
      invocations.push(args);
      return 'true';
    },
  });

  assert.deepEqual(invocations[0][1], ['rev-parse', '--is-shallow-repository']);
  const invocation = invocations[1];
  assert.deepEqual(invocation[0], 'git');
  assert.deepEqual(invocation[1], [
    'fetch',
    '--no-tags',
    '--unshallow',
    'origin',
    'refs/heads/main',
    'refs/heads/integration/26-room-proposals',
  ]);
  assert.equal(invocation[2].stdio, 'ignore');
  assert.equal(invocation[2].env.GIT_CONFIG_KEY_0, 'http.extraheader');
  assert.match(invocation[2].env.GIT_CONFIG_VALUE_0, /^AUTHORIZATION: basic /);
  assert.ok(!invocation[1].includes('test-token'));
});

test('sync verification does not unshallow an already complete repository', () => {
  let fetchArgs;
  fetchMergeHistory({
    baseRef: 'integration/319-roommate-wishes',
    token: 'test-token',
    exec: (_command, args) => {
      if (args[0] === 'fetch') fetchArgs = args;
      return 'false';
    },
  });

  assert.deepEqual(fetchArgs, [
    'fetch',
    '--no-tags',
    'origin',
    'refs/heads/main',
    'refs/heads/integration/319-roommate-wishes',
  ]);
});

test('the automatic merge result is the first merge-tree output line', () => {
  const baseSha = 'a'.repeat(40);
  const mainSha = 'b'.repeat(40);
  const treeSha = 'c'.repeat(40);
  let invocation;

  assert.equal(
    automaticMergeTreeSha({
      baseSha,
      mainSha,
      exec: (...args) => {
        invocation = args;
        return `${treeSha}\nmerged\n`;
      },
    }),
    treeSha,
  );
  assert.deepEqual(invocation[1], [
    'merge-tree',
    '--write-tree',
    baseSha,
    mainSha,
  ]);
});

test('conflicting merges cannot be verified as automatic syncs', () => {
  assert.equal(
    automaticMergeTreeSha({
      baseSha: 'a'.repeat(40),
      mainSha: 'b'.repeat(40),
      exec: () => {
        throw new Error('merge conflict');
      },
    }),
    undefined,
  );
});
