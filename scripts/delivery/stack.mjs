// Pure helpers for stacked PRs: detecting a stack, checking that it is in sync
// and fingerprinting a PR's own slice of the change. No I/O, so the rules can be
// unit-tested; callers supply GitHub data.
import { createHash } from 'node:crypto';

/**
 * Groups open PRs into linear stacks. A PR is stacked on another when its base
 * branch is the other PR's head branch (same repository only).
 *
 * Returns every chain bottom-to-top (`prs[0]` is the bottom, the last is the
 * tip), so a lone PR is a stack of one. Anything that is not a plain chain is
 * reported in `problems` and left out of `stacks`, so callers keep today's
 * per-PR behaviour for it.
 */
export function buildStacks(prs) {
  const open = prs.filter(
    (pr) => pr.state === undefined || pr.state === 'open',
  );
  // A fork's branch names mean nothing here: it is its own stack of one. A
  // deleted fork reports a null head repository, which is just as foreign.
  const sameRepo = (pr) =>
    pr.head?.repo !== null &&
    (!pr.head?.repo?.full_name ||
      !pr.base?.repo?.full_name ||
      pr.head.repo.full_name === pr.base.repo.full_name);
  // GitHub allows several open PRs from one branch to different bases, so a
  // branch name does not identify a PR. Those PRs, and everything stacked on
  // their branch, are left out rather than guessed at.
  const problems = [];
  const onBranch = new Map();
  for (const pr of open)
    if (sameRepo(pr))
      onBranch.set(pr.head.ref, [...(onBranch.get(pr.head.ref) ?? []), pr]);
  const excluded = new Set();
  for (const [ref, group] of onBranch)
    if (group.length > 1) {
      for (const pr of group) excluded.add(pr.number);
      problems.push({
        prs: group.map((pr) => pr.number),
        reason: `branch ${ref} is the head of several open PRs`,
      });
    }
  for (let grew = true; grew;) {
    grew = false;
    const heads = new Set(
      open.filter((pr) => excluded.has(pr.number)).map((pr) => pr.head.ref),
    );
    for (const pr of open)
      if (!excluded.has(pr.number) && sameRepo(pr) && heads.has(pr.base.ref)) {
        excluded.add(pr.number);
        grew = true;
        problems.push({
          prs: [pr.number],
          reason: `PR #${pr.number} is stacked on a branch shared by several PRs`,
        });
      }
  }
  const local = open.filter((pr) => !excluded.has(pr.number));
  const byHead = new Map();
  for (const pr of local) if (sameRepo(pr)) byHead.set(pr.head.ref, pr);
  const children = new Map();
  for (const pr of local) {
    if (!sameRepo(pr)) continue;
    if (!byHead.has(pr.base.ref) || byHead.get(pr.base.ref) === pr) continue;
    const list = children.get(pr.base.ref) ?? [];
    list.push(pr);
    children.set(pr.base.ref, list);
  }

  const stacks = [];
  const seen = new Set();
  const roots = local.filter(
    (pr) =>
      !sameRepo(pr) ||
      !byHead.has(pr.base.ref) ||
      byHead.get(pr.base.ref) === pr,
  );
  for (const root of roots) {
    const chain = [root];
    seen.add(root.number);
    let forkedAt = null;
    let foreign = null;
    // One QA owner has to cover the whole stack, so it has one author.
    const author = (pr) => (pr.user?.login ?? '').toLowerCase();
    for (;;) {
      const next = children.get(chain.at(-1).head.ref) ?? [];
      if (next.length === 0) break;
      if (next.length > 1) {
        forkedAt = chain.at(-1);
        for (const pr of next) seen.add(pr.number);
        break;
      }
      if (seen.has(next[0].number)) break;
      if (author(next[0]) !== author(root)) {
        foreign = next[0];
        seen.add(next[0].number);
        break;
      }
      chain.push(next[0]);
      seen.add(next[0].number);
    }
    if (foreign)
      problems.push({
        prs: [...chain.map((pr) => pr.number), foreign.number],
        reason: `PR #${foreign.number} has a different author than #${root.number}; all PRs of a stack need one author`,
      });
    else if (forkedAt)
      problems.push({
        prs: chain.map((pr) => pr.number),
        reason: `PR #${forkedAt.number} has several PRs stacked on it`,
      });
    else stacks.push({ prs: chain, tip: chain.at(-1), bottom: root });
  }
  // Whatever no root reached is part of a cycle.
  for (const pr of local)
    if (!seen.has(pr.number))
      problems.push({ prs: [pr.number], reason: 'stack contains a cycle' });
  return { stacks, problems };
}

/**
 * Compare the head of the PR below with the PR above. `status` is the GitHub
 * compare status of `parentHead...childHead`: the child contains the parent
 * when it is ahead of it or identical.
 */
export function inSync(status) {
  return status === 'ahead' || status === 'identical';
}

/**
 * Whether `bottom` still targets the branch of a PR which has already merged
 * and contains that PR's head: a stack which `/merge-stack` merged part way and
 * has not retargeted yet. A reused branch name proves nothing, so containment
 * is checked. `list(path)` reads every page of a list endpoint and
 * `compare(base, head)` returns the compare status.
 */
export async function resumableBase({ list, compare, repo, bottom }) {
  if (bottom.base.ref === 'main') return false;
  const closed = await list(
    `/repos/${repo}/pulls?state=closed&head=${encodeURIComponent(`${repo.split('/')[0]}:${bottom.base.ref}`)}`,
  );
  for (const merged of closed.filter((p) => p.merged_at))
    if (inSync(await compare(merged.head.sha, bottom.head.sha))) return true;
  return false;
}

/**
 * Walks a stack and returns the PRs whose branch does not contain the head of
 * the PR below them. `compare(parent, child)` returns the compare status.
 * The bottom PR is checked against main by the caller's usual gates.
 */
export async function outOfSync(stack, compare) {
  const behind = [];
  for (let i = 1; i < stack.prs.length; i++) {
    const parent = stack.prs[i - 1];
    const child = stack.prs[i];
    if (!inSync(await compare(parent.head.sha, child.head.sha)))
      behind.push({ pr: child, parent });
  }
  return behind;
}

// Branch names are user input; keep them from closing a markdown code span.
const safeRef = (ref) => String(ref).replaceAll('`', "'");

/** The fixed text a bot posts for one out-of-sync link. */
export function outOfSyncNote({ pr, parent }) {
  return `Stack out of sync: #${pr.number} does not contain the latest of #${parent.number} (\`${parent.head.sha.slice(0, 7)}\`). Merge \`${safeRef(parent.head.ref)}\` into \`${safeRef(pr.head.ref)}\` (merge, never rebase or squash) and push.`;
}

const FILE_START = /^diff --git a\/(.+) b\/(.+)$/;
const MODE_LINE =
  /^(old mode|new mode|new file mode|deleted file mode|rename from|rename to|similarity index|copy from|copy to)\b/;

/**
 * Fingerprint of a PR's own change: per file the path, mode and rename lines and
 * every hunk line (added, removed and context) exactly as written. Only what
 * moves when the parent branch is merged in is left out: line numbers, the
 * function name after `@@`, and the blob ids of text files. Two diffs with the
 * same fingerprint make the same change in the same place, so a review of one
 * holds for the other; moving a line, re-indenting it or changing a file mode
 * changes it. File order does not matter.
 * `diff` is the unified diff of `parentHead...head`.
 */
export function sliceFingerprint(diff) {
  const files = [];
  let file = null;
  let inHunk = false;
  const lines = String(diff ?? '').split('\n');
  // The text ends with a newline: that last empty piece is not a diff line.
  if (lines.at(-1) === '') lines.pop();
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    const start = FILE_START.exec(line);
    if (start) {
      file = { path: start[2], meta: [], body: [], blob: '', binary: false };
      files.push(file);
      inHunk = false;
      continue;
    }
    if (!file) continue;
    // Inside a hunk every line is content, even one that looks like a header
    // (`+++i;`, a removed `-- comment`).
    if (line.startsWith('@@')) {
      inHunk = true;
      file.body.push('@@');
    } else if (inHunk) {
      file.body.push(line);
    } else if (line.startsWith('index '))
      file.blob = line.split(/\s+/)[1]?.split('..')[1] ?? '';
    else if (MODE_LINE.test(line)) file.meta.push(line);
    else if (/^(Binary files|GIT binary patch)/.test(line)) file.binary = true;
  }
  const parts = files.map((f) =>
    createHash('sha256')
      .update(
        [
          f.path,
          f.meta.join('\n'),
          f.binary ? `binary:${f.blob}` : f.body.join('\n'),
        ].join('\u0000'),
      )
      .digest('hex'),
  );
  return createHash('sha256').update(parts.sort().join('\n')).digest('hex');
}

/**
 * A review of an earlier head still holds for the current head when the PR's
 * own slice is unchanged and the current head contains the earlier one (so only
 * the parent was merged in). `status` is the compare status of
 * `previousHead...currentHead`. Any real edit changes the fingerprint.
 */
export function carriesOver({ previousSlice, currentSlice, status }) {
  return (
    Boolean(previousSlice) && previousSlice === currentSlice && inSync(status)
  );
}
