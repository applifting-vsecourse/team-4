// Pure decisions of the QA notifier (#499): who tests a PR, when to ask them
// and where its issues move on the board. It never blocks anything: merging
// is decided by the repository ruleset alone. No I/O here; see run.mjs.

export const QA_OWNER = 'MatejKrones';
/** Tests the PRs the QA owner authors. */
export const QA_SUBSTITUTE = 'darebakdavca';
/** Code owners; an owner's approval also covers QA (ADR-0005). */
export const CODE_OWNERS = ['rmnskb', 'darebakdavca'];

export const READY_FOR_TESTING = 'Ready for Testing';
export const IN_PROGRESS = 'In Progress';
export const DONE = 'Done';
/** Statuses an issue leaves for Ready for Testing; later ones are left alone. */
const BEFORE_TESTING = ['Sprint Backlog', IN_PROGRESS, 'Ready for Code Review'];

export const qaOwnerFor = (author) =>
  author === QA_OWNER ? QA_SUBSTITUTE : QA_OWNER;

/** Documentation alone needs a teammate's approval, not a tester. */
export const isDocsOnly = (paths) =>
  paths.length > 0 && paths.every((path) => /\.md$|^docs\//.test(path));

/**
 * Issues a PR body links, comments and code ignored: `closes` with a closing
 * keyword (Closes, Fixes, Resolves), `refs` the ones it only refers to.
 */
export function linkedIssues(body = '') {
  const prose = (body ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '');
  const closes = new Set();
  const refs = new Set();
  for (const match of prose.matchAll(
    /\b(close[sd]?|fix(?:e[sd])?|resolve[sd]?|refs?):?\s+#(\d+)\b/gi,
  ))
    (/^ref/i.test(match[1]) ? refs : closes).add(Number(match[2]));
  for (const number of closes) refs.delete(number);
  return { closes: [...closes], refs: [...refs] };
}

/**
 * What to do when CI finished for the current commit of a PR.
 *
 * @returns {{ request: string | null, status: string | null, reason: string }}
 *   `request` is the reviewer to ask, `status` the board status for its issues.
 */
export function onChecks({ pr, sha, passed, paths, reviews }) {
  if (pr.state !== 'open') return nothing('the PR is not open');
  if (pr.draft) return nothing('the PR is a draft');
  if (pr.base.ref !== 'main') return nothing('the PR does not target main');
  if (pr.head.sha !== sha) return nothing('a newer commit is on the PR');
  // Dependabot updates need a code owner's approval, not a tester.
  if (pr.user.login === 'dependabot[bot]')
    return nothing('a dependency update: a code owner approves it');
  if (!passed)
    return { request: null, status: IN_PROGRESS, reason: 'checks failed' };
  if (isDocsOnly(paths))
    return nothing('documentation only: any teammate approves it');
  const owner = qaOwnerFor(pr.user.login);
  const onThisCommit = reviews.filter(
    (review) =>
      review.commit_id === sha && review.user?.login !== pr.user.login,
  );
  // An approval by the tester or by a code owner covers QA of this commit.
  const approver = onThisCommit.find(
    (review) =>
      review.state === 'APPROVED' &&
      [owner, ...CODE_OWNERS].includes(review.user?.login),
  );
  if (approver)
    return {
      request: null,
      status: READY_FOR_TESTING,
      reason: `${approver.user.login} already approved this commit`,
    };
  // The tester already looked at this commit: a re-run of CI asks nobody again.
  const tested = onThisCommit.find(
    (review) => review.user?.login === owner && review.state !== 'APPROVED',
  );
  if (tested)
    return nothing(`${owner} already reviewed this commit (${tested.state})`);
  const requested = pr.requested_reviewers.some((user) => user.login === owner);
  return {
    request: requested ? null : owner,
    status: READY_FOR_TESTING,
    reason: requested ? `${owner} is already asked` : `asking ${owner} to test`,
  };
}

/** Whether an issue in `current` may move to `target`; people's moves win. */
export function mayMove(current, target) {
  if (!current || current === target) return false;
  // A merge that closes the issue finishes it from wherever it was.
  if (target === DONE) return true;
  if (target === READY_FOR_TESTING) return BEFORE_TESTING.includes(current);
  // Failed checks only pull an issue back from testing.
  return target === IN_PROGRESS && current === READY_FOR_TESTING;
}

function nothing(reason) {
  return { request: null, status: null, reason };
}
