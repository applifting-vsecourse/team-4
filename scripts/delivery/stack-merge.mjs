// Merges a whole stack of PRs onto main, bottom to top. Triggered by the
// `/merge-stack` comment command (see stack-merge-command.mjs). Branch
// protection still decides what may merge (CI and Delivery stages), so this
// can only do what a series of clicks could.
import {
  buildStacks,
  outOfSync,
  outOfSyncNote,
  resumableBase,
} from './stack.mjs';

const STATUS = 'Delivery stages';
const CI = 'verify';

/** The stack cannot merge yet; nothing was changed. */
export class NotReady extends Error {}

// Branch names are user input; keep them from closing a markdown code span.
const safe = (ref) => String(ref).replaceAll('`', "'");

/** Why this stack may not merge yet, from the latest Delivery stages statuses. */
export function preflight(stack, statuses, ci = new Map()) {
  const reasons = [];
  for (const pr of stack.prs) {
    if (pr.draft) reasons.push(`#${pr.number}: still a draft.`);
    const status = statuses.get(pr.number);
    if (status?.state !== 'success')
      reasons.push(
        `#${pr.number}: ${STATUS} is ${status?.state ?? 'missing'}${status?.description ? ` (${status.description})` : ''}.`,
      );
    // Branch protection also requires CI, but a token owner who can bypass the
    // ruleset would skip it, so the stack is held to it here as well.
    if (ci.get(pr.number) !== 'success')
      reasons.push(
        `#${pr.number}: CI (${CI}) is ${ci.get(pr.number) ?? 'missing'}.`,
      );
  }
  return reasons;
}

/**
 * @param api (path, { method, body }) => json; throws on a failed request.
 * @param write Same shape, used for the merges and retargets only. It must act
 *   as a person or app whose pushes trigger workflows (not the workflow token),
 *   otherwise deploy, release and the re-evaluation after a retarget never run.
 * @param wait (ms) => Promise, injectable so tests need not sleep.
 */
export async function mergeStack({
  api,
  write = api,
  repo,
  number,
  dryRun = false,
  requireStack = false,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = () => Date.now(),
  timeoutMs = 10 * 60 * 1000,
  pendingTimeoutMs = 5 * 60 * 1000,
  log = console.log,
}) {
  // A stack missing a member would look like a shorter, valid stack, so every
  // page of open PRs is read.
  const all = async (path) => {
    const items = [];
    for (let page = 1; ; page++) {
      const batch = await api(`${path}&per_page=100&page=${page}`);
      items.push(...batch);
      if (batch.length < 100) return items;
    }
  };
  const open = await all(`/repos/${repo}/pulls?state=open`);
  const { stacks } = buildStacks(open);
  const stack = stacks.find((s) => s.prs.some((p) => p.number === number));
  if (!stack)
    throw new NotReady(
      `#${number} is not an open PR in a plain stack (a fork in the chain, a cycle or no such PR).`,
    );
  // A bottom PR whose base is not main is only acceptable when that base is
  // the branch of a PR which has already merged (an interrupted earlier run).
  const bottom = stack.bottom;
  const compare = async (parent, child) =>
    (await api(`/repos/${repo}/compare/${parent}...${child}`)).status;
  const resuming = await resumableBase({ list: all, compare, repo, bottom });
  if (bottom.base.ref !== 'main' && !resuming)
    throw new NotReady(
      `#${bottom.number} targets ${safe(bottom.base.ref)}, which is neither main nor the branch of a merged PR it contains.`,
    );
  // The last PR of a half-merged stack is alone, but still finishes the stack.
  if (requireStack && stack.prs.length < 2 && !resuming)
    throw new NotReady(
      `#${number} is not part of a stack; merge it with the merge button.`,
    );

  // The command comment itself re-runs the delivery check for the whole stack,
  // which marks each PR `pending` for a moment. That is not a refusal: wait for
  // the results to settle, up to a limit, and judge what they settle to.
  const read = async () => {
    const statuses = new Map();
    const ci = new Map();
    for (const pr of stack.prs) {
      const combined = await api(
        `/repos/${repo}/commits/${pr.head.sha}/status`,
      );
      statuses.set(
        pr.number,
        combined.statuses.find((s) => s.context === STATUS),
      );
      const { check_runs: runs } = await api(
        `/repos/${repo}/commits/${pr.head.sha}/check-runs?check_name=${CI}&filter=latest`,
      );
      const run = runs.find((r) => r.name === CI);
      ci.set(pr.number, run ? (run.conclusion ?? run.status) : undefined);
    }
    return { statuses, ci };
  };
  const settling = now();
  let { statuses, ci } = await read();
  for (;;) {
    const pending = stack.prs.filter(
      (pr) => statuses.get(pr.number)?.state === 'pending',
    );
    if (!pending.length || now() - settling > pendingTimeoutMs) break;
    log(
      `Waiting for ${STATUS} on ${pending.map((pr) => `#${pr.number}`).join(', ')}…`,
    );
    await wait(10_000);
    ({ statuses, ci } = await read());
  }
  const reasons = preflight(stack, statuses, ci);
  for (const link of await outOfSync(
    stack,
    async (parent, child) =>
      (await api(`/repos/${repo}/compare/${parent}...${child}`)).status,
  ))
    reasons.push(outOfSyncNote(link));
  if (reasons.length)
    throw new NotReady(
      `Stack is not ready to merge:\n${reasons.map((r) => `  - ${r}`).join('\n')}`,
    );

  const order = stack.prs.map((p) => `#${p.number}`).join(' → ');
  log(`Stack, bottom to top: ${order}`);
  if (dryRun) {
    log(
      '[dry-run] would merge each PR with a merge commit, retargeting the next to main.',
    );
    return { merged: [], dryRun: true };
  }

  const merged = [];
  for (const planned of stack.prs) {
    let pr = await api(`/repos/${repo}/pulls/${planned.number}`);
    if (pr.head.sha !== planned.head.sha)
      throw new Error(
        `#${pr.number} changed while merging (${planned.head.sha.slice(0, 7)} → ${pr.head.sha.slice(0, 7)}); merged so far: ${merged.map((n) => `#${n}`).join(', ') || 'none'}. Re-run once its checks pass again.`,
      );
    // The PR below has merged, so this one is judged again against main before
    // it merges: we retarget it, or GitHub already did when it deleted the
    // merged branch. Either way a fresh evaluation must come first.
    if (planned.base.ref !== 'main') {
      // A fresh evaluation is a status newer than the one we see now; ids are
      // monotonic, so no clock comparison with GitHub is needed.
      const latest = async () =>
        (
          await api(`/repos/${repo}/commits/${pr.head.sha}/status`)
        ).statuses.find((s) => s.context === STATUS);
      // If we retarget, only a status newer than the current one counts. If
      // GitHub already did, the evaluation may have run since the preflight.
      const before =
        pr.base.ref !== 'main'
          ? ((await latest())?.id ?? 0)
          : (statuses.get(planned.number)?.id ?? 0);
      const started = now();
      if (pr.base.ref !== 'main') {
        await write(`/repos/${repo}/pulls/${pr.number}`, {
          method: 'PATCH',
          body: { base: 'main' },
        });
        log(`#${pr.number}: retargeted to main, waiting for ${STATUS}…`);
      } else log(`#${pr.number}: already on main, waiting for ${STATUS}…`);
      for (;;) {
        const status = await latest();
        if (status && status.id > before) {
          if (status.state === 'success') {
            // A run which started before the retarget may still publish after
            // it. Let it land: only a result which stays put counts.
            await wait(10_000);
            if ((await latest())?.id === status.id) break;
            continue;
          }
          if (status.state !== 'pending')
            throw new Error(
              `#${pr.number}: ${STATUS} is ${status.state} after retargeting (${status.description}); merged so far: ${merged.map((n) => `#${n}`).join(', ')}.`,
            );
        }
        if (now() - started > timeoutMs)
          throw new Error(
            `#${pr.number}: ${STATUS} did not finish within ${Math.round(timeoutMs / 60000)} minutes after retargeting; merged so far: ${merged.map((n) => `#${n}`).join(', ')}. Re-run to continue.`,
          );
        await wait(10_000);
      }
    }
    try {
      // The sha guard refuses the merge if anything was pushed meanwhile.
      await write(`/repos/${repo}/pulls/${pr.number}/merge`, {
        method: 'PUT',
        body: { merge_method: 'merge', sha: pr.head.sha },
      });
    } catch (error) {
      throw new Error(
        `#${pr.number} could not be merged: ${error.message}; merged so far: ${merged.map((n) => `#${n}`).join(', ') || 'none'}. Re-run to continue.`,
      );
    }
    merged.push(pr.number);
    log(`#${pr.number}: merged`);
  }
  return { merged };
}
