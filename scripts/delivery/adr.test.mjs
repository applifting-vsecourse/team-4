import test from 'node:test';
import assert from 'node:assert/strict';
import { adrNumber, adrReasons, adrStatus, changedAdrs } from './adr.mjs';

const head = 'a'.repeat(40);
const earlier = 'b'.repeat(40);
const path = 'docs/adr/0001-feature-integration-branches.md';
const record = (status) => `# ADR-0001: Title\n\n- **Status:** ${status}\n`;
const accepted = record('Accepted 2026-11-13 in #361');
const pr = { head: { sha: head }, base: { ref: 'main' } };
const added = [{ filename: path, status: 'added' }];
const review = (overrides = {}) => ({
  state: 'COMMENTED',
  user: { login: 'rmnskb' },
  body: '/adr-accept 0001',
  commit_id: head,
  ...overrides,
});
const blocked =
  'ADR-0001 needs a Comment review "/adr-accept 0001" by @rmnskb or @darebakdavca on its current text.';

// `refs` maps a commit or branch to its docs/adr entries: { [path]: blob },
// or { [path]: { sha, type } } for a non-file. Blobs map to their text.
function check({
  reviews = [review()],
  files = added,
  refs = { [head]: { [path]: 'blob-1' } },
  blobs = { 'blob-1': accepted },
} = {}) {
  const list = async (ref) =>
    Object.entries(refs[ref] ?? {}).map(([p, e]) =>
      typeof e === 'string'
        ? { path: p, sha: e, type: 'file' }
        : { path: p, ...e },
    );
  const text = async (sha) => blobs[sha];
  return adrReasons({ pr, files, reviews, list, text });
}

test('recognises numbered ADR files, their status and changed paths', () => {
  assert.equal(adrNumber(path), '0001');
  assert.equal(adrNumber('docs/adr/README.md'), null);
  assert.equal(adrStatus(record('Superseded by ADR-0002')), 'Superseded');
  assert.equal(adrStatus('# No status'), null);
  assert.deepEqual(
    changedAdrs([
      ...added,
      { filename: 'docs/adr/0002-old.md', status: 'removed' },
      { filename: 'docs/adr/README.md', status: 'modified' },
      { filename: 'docs/adr/template.md', status: 'modified' },
      { filename: 'docs/ADR/0003-x.md', status: 'added' },
      { filename: 'docs/notes.md', status: 'added' },
    ]),
    [path, 'docs/ADR/0003-x.md'],
  );
});

test('a PR without ADR changes reads nothing', async () => {
  const fail = async () => assert.fail('must not read');
  for (const files of [
    [],
    [{ filename: 'docs/adr/README.md', status: 'modified' }],
    [{ filename: path, status: 'removed' }],
  ])
    assert.deepEqual(
      await adrReasons({ pr, files, reviews: [], list: fail, text: fail }),
      [],
    );
});

test('an accepted ADR passes with a Comment review on the same text', async () => {
  assert.deepEqual(await check(), []);
  // A review on an earlier commit counts while the file is unchanged.
  assert.deepEqual(
    await check({
      reviews: [review({ commit_id: earlier })],
      refs: { [head]: { [path]: 'blob-1' }, [earlier]: { [path]: 'blob-1' } },
    }),
    [],
  );
  // Only a later review matches the current text.
  assert.deepEqual(
    await check({
      reviews: [review({ commit_id: earlier }), review()],
      refs: { [head]: { [path]: 'blob-1' }, [earlier]: { [path]: 'blob-0' } },
    }),
    [],
  );
  for (const body of ['/adr-accept 0002 0001', '/adr-accept\n0001'])
    assert.deepEqual(await check({ reviews: [review({ body })] }), [], body);
  for (const login of ['RMNSKB', 'darebakdavca'])
    assert.deepEqual(
      await check({ reviews: [review({ user: { login } })] }),
      [],
      login,
    );
});

test('an accepted ADR without a valid acceptance blocks', async () => {
  for (const reviews of [
    [],
    [review({ user: { login: 'MatejKrones' } })],
    [review({ state: 'APPROVED' })],
    [review({ body: '/adr-accept 0002' })],
    [review({ body: '/adr-accept 1' })],
    [review({ body: 'Looks good. /adr-accept 0001' })],
    [review({ commit_id: undefined })],
  ])
    assert.deepEqual(await check({ reviews }), [blocked]);
  // The text changed after the review, the file was not there yet, or it was
  // a symlink then.
  for (const then of [
    { [path]: 'blob-0' },
    {},
    { [path]: { sha: 'blob-1', type: 'symlink' } },
  ])
    assert.deepEqual(
      await check({
        reviews: [review({ commit_id: earlier })],
        refs: { [head]: { [path]: 'blob-1' }, [earlier]: then },
      }),
      [blocked],
    );
});

test('a Proposed or unknown status cannot merge', async () => {
  assert.deepEqual(await check({ blobs: { 'blob-1': record('Proposed') } }), [
    'ADR-0001 is still Proposed; set its final status before @rmnskb or @darebakdavca accepts it.',
  ]);
  for (const text of ['# ADR-0001\n', record('Rejected')])
    assert.deepEqual(await check({ blobs: { 'blob-1': text } }), [
      'ADR-0001 needs a status line with Accepted, Superseded, Deprecated or Proposed.',
    ]);
});

test('superseded and deprecated records need acceptance too', async () => {
  const blobs = { 'blob-1': record('Superseded by ADR-0002') };
  assert.deepEqual(await check({ blobs }), []);
  assert.deepEqual(await check({ blobs, reviews: [] }), [blocked]);
});

test('files under docs/adr/ that are not well-formed records block', async () => {
  for (const filename of [
    'docs/adr/0002-Use-Kafka.md',
    'docs/adr/0002_kafka.md',
    'docs/adr/00002-x.md',
    'docs/adr/sub/0002-x.md',
    'docs/adr/0002-x.MD',
    'docs/ADR/0002-x.md',
    'docs/adr/notes.txt',
  ])
    assert.deepEqual(
      await check({ files: [{ filename, status: 'added' }], refs: {} }),
      [
        `${filename} is not a valid ADR path; name records docs/adr/NNNN-short-title.md.`,
      ],
    );
  // Renaming an accepted record to a bad name cannot escape the gate.
  assert.equal(
    (
      await check({
        files: [
          {
            filename: 'docs/adr/0001-X.md',
            previous_filename: path,
            status: 'renamed',
          },
        ],
      })
    ).length,
    1,
  );
  assert.deepEqual(
    await check({
      refs: { [head]: { [path]: { sha: 'blob-1', type: 'symlink' } } },
    }),
    ['ADR-0001 must be a regular file, not a symlink.'],
  );
});

test('a renamed record is gated under its new path', async () => {
  const renamed = 'docs/adr/0001-integration-branches.md';
  const files = [
    { filename: renamed, previous_filename: path, status: 'renamed' },
  ];
  // The old path on the base is replaced by this PR, so it is no duplicate.
  const refs = { [head]: { [renamed]: 'blob-1' }, main: { [path]: 'blob-1' } };
  assert.deepEqual(await check({ files, refs }), []);
  assert.deepEqual(
    await check({
      files,
      refs: { ...refs, [earlier]: { [path]: 'blob-1' } },
      reviews: [review({ commit_id: earlier })],
    }),
    [blocked],
    'an acceptance of the old path does not carry over',
  );
});

test('a number used by another record blocks', async () => {
  const other = 'docs/adr/0001-another-decision.md';
  const reason = `ADR number 0001 is already used by another record; renumber ${path}.`;
  // Within the PR head, or added to the base after the PR branched.
  assert.deepEqual(
    await check({ refs: { [head]: { [path]: 'blob-1', [other]: 'blob-2' } } }),
    [reason],
  );
  assert.deepEqual(
    await check({
      refs: { [head]: { [path]: 'blob-1' }, main: { [other]: 'blob-2' } },
    }),
    [reason],
  );
  // A base record this PR removes is no conflict.
  assert.deepEqual(
    await check({
      files: [...added, { filename: other, status: 'removed' }],
      refs: { [head]: { [path]: 'blob-1' }, main: { [other]: 'blob-2' } },
    }),
    [],
  );
});

test('a changed record missing from the head listing fails closed', async () => {
  await assert.rejects(check({ refs: {} }), /Cannot find/);
});
