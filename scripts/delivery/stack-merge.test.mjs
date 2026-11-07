import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeStack, preflight } from './stack-merge.mjs';
import { repo, sha } from './stack-fake.mjs';

const base = { repo: 'o/r', wait: async () => {}, log: () => {} };

test('merges a stack bottom to top with merge commits, retargeting each next PR', async () => {
  const { api, calls } = repo();
  const { merged } = await mergeStack({ ...base, api, number: 2 });
  assert.deepEqual(merged, [1, 2, 3]);
  assert.deepEqual(calls, [
    ['merge', 1, { merge_method: 'merge', sha: sha(1) }],
    ['retarget', 2, 'main'],
    ['merge', 2, { merge_method: 'merge', sha: sha(2) }],
    ['retarget', 3, 'main'],
    ['merge', 3, { merge_method: 'merge', sha: sha(3) }],
  ]);
});

test('any member of the stack selects the whole stack', async () => {
  for (const number of [1, 2, 3]) {
    const { api } = repo();
    const { merged } = await mergeStack({ ...base, api, number });
    assert.deepEqual(merged, [1, 2, 3]);
  }
});

test('nothing merges unless every PR passes its delivery stages', async () => {
  const { api, calls } = repo({ status: { 2: 'failure' } });
  await assert.rejects(
    mergeStack({ ...base, api, number: 1 }),
    /#2: Delivery stages is failure/,
  );
  assert.deepEqual(calls, []);
});

test('a missing status counts as not ready', () => {
  const stack = { prs: [{ number: 5, draft: false }] };
  assert.match(
    preflight(stack, new Map())[0],
    /#5: Delivery stages is missing/,
  );
  assert.deepEqual(
    preflight(
      stack,
      new Map([[5, { state: 'success' }]]),
      new Map([[5, 'success']]),
    ),
    [],
  );
});

test('an out-of-sync stack is refused with the fix', async () => {
  const { api, calls, prs, statuses } = repo();
  // #2 has a new head which does not contain #1.
  prs[1].head.sha = sha(0);
  statuses.set(sha(0), { id: 1, context: 'Delivery stages', state: 'success' });
  await assert.rejects(
    mergeStack({ ...base, api, number: 1 }),
    /Stack out of sync: #2 does not contain the latest of #1/,
  );
  assert.deepEqual(calls, []);
});

test('a dry run writes nothing', async () => {
  const { api, calls } = repo();
  const result = await mergeStack({ ...base, api, number: 1, dryRun: true });
  assert.equal(result.dryRun, true);
  assert.deepEqual(calls, []);
});

test('a failed merge stops, names what merged, and retargets nothing further', async () => {
  const { api, calls } = repo({ failMerge: 2 });
  await assert.rejects(
    mergeStack({ ...base, api, number: 1 }),
    /#2 could not be merged: 405 required check; merged so far: #1/,
  );
  assert.deepEqual(
    calls.filter(([kind]) => kind === 'retarget').map((c) => c[1]),
    [2],
  );
});

test('a push during the merge is refused by the sha guard', async () => {
  const { api } = repo({ moveHead: 2 });
  await assert.rejects(
    mergeStack({ ...base, api, number: 1 }),
    /#2 changed while merging.*merged so far: #1/,
  );
});

test('re-running after an interruption continues from the next PR', async () => {
  // #1 already merged; #2 still points at its branch.
  const { api, calls, prs } = repo({
    mergedBase: [{ ref: 'b1', sha: sha(1), merged_at: '2026-11-06T00:00:00Z' }],
  });
  prs[0].state = 'closed';
  const { merged } = await mergeStack({ ...base, api, number: 2 });
  assert.deepEqual(merged, [2, 3]);
  assert.equal(calls[0][0], 'retarget');
});

test('a base that is not main or a merged PR branch is refused', async () => {
  const { api, calls, prs } = repo();
  prs[0].state = 'closed'; // closed without merging
  await assert.rejects(
    mergeStack({ ...base, api, number: 2 }),
    /neither main nor the branch of a merged PR/,
  );
  assert.deepEqual(calls, []);
});

function clock() {
  let time = 0;
  return {
    now: () => time,
    wait: async (ms) => {
      time += ms;
    },
  };
}

test('waits for the evaluation that follows a retarget before merging', async () => {
  const { api, calls } = repo({ lag: 3 });
  const waits = [];
  const c = clock();
  await mergeStack({
    ...base,
    api,
    number: 1,
    now: c.now,
    wait: async (ms) => {
      waits.push(ms);
      await c.wait(ms);
    },
  });
  // Two retargets, each answered only after a few polls.
  assert.ok(waits.length >= 6, `waited ${waits.length} times`);
  const kinds = calls.map(([kind]) => kind);
  assert.deepEqual(kinds, ['merge', 'retarget', 'merge', 'retarget', 'merge']);
});

test('a failing evaluation after a retarget stops the merge', async () => {
  const { api, calls } = repo({ lag: 1, afterRetarget: 'failure' });
  await assert.rejects(
    mergeStack({ ...base, api, number: 1, ...clock() }),
    /#2: Delivery stages is failure after retargeting.*merged so far: #1/,
  );
  assert.deepEqual(
    calls.filter(([kind]) => kind === 'merge').map((c) => c[1]),
    [1],
  );
});

test('an evaluation that never arrives times out and can be re-run', async () => {
  const { api } = repo({ afterRetarget: 'never' });
  await assert.rejects(
    mergeStack({ ...base, api, number: 1, timeoutMs: 60_000, ...clock() }),
    /did not finish within 1 minutes.*merged so far: #1\. Re-run/,
  );
});

test('a PR that is not in a plain stack is refused', async () => {
  const { api } = repo();
  await assert.rejects(
    mergeStack({ ...base, api, number: 99 }),
    /not an open PR in a plain stack/,
  );
});

test('a stack whose CI is not green is refused even if the token could bypass it', async () => {
  for (const conclusion of ['failure', 'missing']) {
    const { api, calls } = repo({ ci: { 2: conclusion } });
    await assert.rejects(
      mergeStack({ ...base, api, number: 1 }),
      /#2: CI \(verify\) is/,
    );
    assert.deepEqual(calls, []);
  }
});

test('when GitHub retargets the next PR itself, a fresh evaluation is still awaited', async () => {
  const { api, calls } = repo({ autoRetarget: true, lag: 2 });
  const waits = [];
  await mergeStack({
    ...base,
    api,
    number: 1,
    wait: async (ms) => waits.push(ms),
  });
  assert.ok(waits.length >= 4, `waited ${waits.length} times`);
  // No retarget calls of ours, and every merge still happened in order.
  assert.deepEqual(
    calls.map(([kind, n]) => `${kind}:${n}`),
    ['merge:1', 'merge:2', 'merge:3'],
  );
});

test('a branch name reused by an unrelated merged PR is not a resumable base', async () => {
  const { api, calls, prs } = repo({
    // Merged, but its head is not in the history of #2.
    mergedBase: [
      { ref: 'b1', sha: sha(900), merged_at: '2026-11-06T00:00:00Z' },
    ],
  });
  prs[0].state = 'closed';
  await assert.rejects(
    mergeStack({ ...base, api, number: 2 }),
    /neither main nor the branch of a merged PR it contains/,
  );
  assert.deepEqual(calls, []);
});

test('every page of open PRs is read before judging the stack', async () => {
  const { api, prs } = repo();
  const filler = Array.from({ length: 150 }, (_, i) => ({
    number: 1000 + i,
    state: 'open',
    draft: false,
    head: { ref: `x${i}`, sha: sha(1000 + i) },
    base: { ref: 'main' },
  }));
  const pages = [];
  const paged = async (path, options) => {
    if (/pulls\?state=open/.test(path)) {
      const page = Number(/[?&]page=(\d+)/.exec(path)[1]);
      pages.push(page);
      const everything = [...filler, ...prs]; // the stack is on page 2
      return everything.slice((page - 1) * 100, page * 100);
    }
    return api(path, options);
  };
  const { merged } = await mergeStack({ ...base, api: paged, number: 1 });
  assert.deepEqual(merged, [1, 2, 3]);
  assert.ok(pages.includes(2));
});

test('a result which is replaced while settling is judged again', async () => {
  const { api, calls, statuses } = repo({ lag: 0 });
  let bumpedId = 0;
  let judgedBump = false;
  const racing = async (path, options = {}) => {
    const statusRead = /\/commits\/(\w+)\/status$/.exec(path);
    if (options.method === 'PUT' && /\/pulls\/2\/merge$/.test(path))
      // The merge must come after the late result was seen and judged.
      assert.ok(judgedBump, 'merged #2 before judging the late result');
    const result = await api(path, options);
    if (statusRead) {
      const current = statuses.get(statusRead[1]);
      if (
        !bumpedId &&
        statusRead[1] === '0'.repeat(39) + '2' &&
        calls.some(([kind]) => kind === 'retarget')
      ) {
        // A late run publishes right after the first fresh success was read.
        bumpedId = current.id + 50;
        statuses.set(statusRead[1], {
          ...current,
          id: bumpedId,
          state: 'success',
        });
      } else if (bumpedId && current?.id === bumpedId) judgedBump = true;
    }
    return result;
  };
  const { merged } = await mergeStack({ ...base, api: racing, number: 1 });
  assert.deepEqual(merged, [1, 2, 3]);
  assert.ok(bumpedId);
});

test('the last PR of a half-merged stack is still merged by a retry', async () => {
  // #1 merged; #2 is all that is left and still targets #1's branch.
  const { api, calls, prs } = repo({
    count: 2,
    mergedBase: [{ ref: 'b1', sha: sha(1), merged_at: '2026-11-06T00:00:00Z' }],
  });
  prs[0].state = 'closed';
  const { merged } = await mergeStack({
    ...base,
    api,
    number: 2,
    requireStack: true,
  });
  assert.deepEqual(merged, [2]);
  assert.deepEqual(
    calls.map(([kind, n]) => `${kind}:${n}`),
    ['retarget:2', 'merge:2'],
  );
});

test('a lone PR on main is still not a stack', async () => {
  const { api, calls } = repo({ count: 1 });
  await assert.rejects(
    mergeStack({ ...base, api, number: 1, requireStack: true }),
    /not part of a stack/,
  );
  assert.deepEqual(calls, []);
});
