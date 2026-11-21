// Feature integration flow: frontend and backend child PRs merge into an
// `integration/` branch linked to a parent issue, and only the parent PR into
// main goes through human QA. Pure rules, no I/O: run.mjs supplies live
// GitHub data, normalised as described on `integrationRole`.
import { ENFORCEMENT_PATHS } from './severity.mjs';
import { agentReviewPassed } from './lib.mjs';

export const INTEGRATION_PREFIX = 'integration/';
export const AREA_LABELS = {
  'area:frontend': 'frontend',
  'area:backend': 'backend',
};
// The CI lanes a PR into an integration branch must pass. Integration work
// linked to the parent issue touches both sides, so it needs both lanes.
export const REQUIRED_LANES = {
  frontend: ['checks', 'stories'],
  backend: ['checks', 'database'],
  integration: ['checks', 'database', 'stories'],
};

export const isIntegrationBranch = (ref) =>
  typeof ref === 'string' &&
  ref.startsWith(INTEGRATION_PREFIX) &&
  ref.length > INTEGRATION_PREFIX.length;

/**
 * A parent PR: from an integration branch of this repository into main. A
 * fork's branch of the same name is an ordinary PR.
 */
export const isParentPr = (pr) =>
  pr.base?.ref === 'main' &&
  isIntegrationBranch(pr.head?.ref) &&
  Boolean(pr.head?.repo?.full_name) &&
  pr.head.repo.full_name === pr.base?.repo?.full_name;

/**
 * When a PR's base last changed (0 if never), from its issue timeline. Reviews
 * and CI runs from before it were made against another base.
 */
export const retargetedAt = (timeline) =>
  Math.max(
    0,
    ...timeline
      .filter((event) => event.event === 'base_ref_changed')
      .map((event) => Date.parse(event.created_at)),
  );

/** A PR from an integration branch of this repository, whatever its base. */
export const fromIntegrationBranch = (pr) =>
  isIntegrationBranch(pr.head?.ref) &&
  Boolean(pr.head?.repo?.full_name) &&
  pr.head.repo.full_name === pr.base?.repo?.full_name;

/** The areas an issue is labelled with, e.g. ['frontend']. */
export function areasOf(issue) {
  const names = (issue.labels ?? []).map((label) =>
    typeof label === 'string' ? label : label?.name,
  );
  return [
    ...new Set(
      names
        .filter((name) => Object.hasOwn(AREA_LABELS, name))
        .map((name) => AREA_LABELS[name]),
    ),
  ];
}

const invalid = (reason) => ({ kind: 'invalid', reason });

/** The issue number an `integration/<issue>-<slug>` branch is named after. */
const branchIssueOf = (branch) => {
  const number = /^integration\/([1-9]\d*)-[^/]+$/.exec(branch)?.[1];
  return number === undefined ? null : Number(number);
};

/**
 * Whether `issue` (`{ number, branches }`) owns the integration `branch`: it
 * links the branch, or GitHub replaced that link with the parent PR opened
 * from it. Then the branch is named after the issue and an open parent PR
 * from it closes the issue (`closedByParentPr`, the issue numbers closed by
 * open PRs from the branch into main): an explicit native link either way.
 */
export function ownsIntegrationBranch(issue, branch, closedByParentPr = []) {
  return (
    issue.branches.includes(branch) ||
    (branchIssueOf(branch) === issue.number &&
      closedByParentPr.includes(issue.number))
  );
}

/**
 * What a PR into an integration branch is. `issues` are its linked issues as
 * `{ number, state, labels, branches, parent }`, where `branches` are the
 * branch names linked to the issue and `parent` is
 * `{ number, state, branches }` or null.
 *
 * - `integration`: links the open parent issue that links the base branch.
 * - `child`: links one open sub-issue with exactly one area label, whose
 *   parent issue links the PR's base branch.
 * - `invalid`: anything else, with the reason.
 *
 * `closedByParentPr` are the issues closed by open PRs from the base branch
 * into main; see `ownsIntegrationBranch`. Without it, work into the branch
 * would be refused for as long as its parent PR is open.
 *
 * Returns null for a PR whose base is not an integration branch.
 */
export function integrationRole({ pr, issues, closedByParentPr = [] }) {
  const base = pr.base.ref;
  if (!isIntegrationBranch(base)) return null;
  if (issues.length !== 1)
    return invalid(
      `A PR into ${base} must link exactly one issue: its sub-issue or the parent issue.`,
    );
  const [issue] = issues;
  if (issue.state !== 'OPEN')
    return invalid(`Issue #${issue.number} is closed.`);
  // Checked first: the parent issue may itself be a sub-issue of an epic.
  if (ownsIntegrationBranch(issue, base, closedByParentPr))
    return {
      kind: 'integration',
      issue: issue.number,
      parent: issue.number,
      lanes: REQUIRED_LANES.integration,
    };
  if (issue.parent) {
    if (issue.parent.state !== 'OPEN')
      return invalid(`Parent issue #${issue.parent.number} is closed.`);
    if (!ownsIntegrationBranch(issue.parent, base, closedByParentPr))
      return invalid(
        `Parent issue #${issue.parent.number} of #${issue.number} does not link ${base}.`,
      );
    const areas = areasOf(issue);
    if (areas.length !== 1)
      return invalid(
        `Sub-issue #${issue.number} needs exactly one of area:frontend or area:backend.`,
      );
    return {
      kind: 'child',
      area: areas[0],
      issue: issue.number,
      parent: issue.parent.number,
      lanes: REQUIRED_LANES[areas[0]],
    };
  }
  return invalid(
    `#${issue.number} is neither a sub-issue of the issue linking ${base} nor that issue.`,
  );
}

/**
 * The `child-verify` verdict: the required CI lanes for this role passed on
 * this commit. `jobs` are the jobs of the latest CI run for the PR head as
 * `{ name, status, conclusion }`, or null when there is no run yet.
 */
export function childVerify({ role, jobs }) {
  if (!role)
    return {
      state: 'failure',
      description: 'Not a PR into an integration branch.',
    };
  if (role.kind === 'invalid')
    return { state: 'failure', description: role.reason };
  if (!jobs)
    return { state: 'pending', description: 'Waiting for CI on this commit.' };
  const failed = [];
  const waiting = [];
  for (const lane of role.lanes) {
    const job = jobs.find((j) => j.name === lane);
    if (!job || job.status !== 'completed') waiting.push(lane);
    else if (job.conclusion !== 'success')
      failed.push(`${lane} (${job.conclusion})`);
  }
  const label = role.kind === 'child' ? `${role.area} child` : 'integration';
  if (failed.length)
    return {
      state: 'failure',
      description: `${label}: ${failed.join(', ')} failed.`,
    };
  if (waiting.length)
    return {
      state: 'pending',
      description: `${label}: waiting for ${waiting.join(', ')}.`,
    };
  return {
    state: 'success',
    description: `${label}: ${role.lanes.join(', ')} passed.`,
  };
}

/**
 * A sync PR may carry enforcement files into an integration branch only when
 * its merge commit is exactly Git's automatic merge of the current base and
 * current main. This preserves feature work already present on the base while
 * preventing a sync branch from adding its own edits or conflict resolutions.
 */
export function isVerifiedMainSync({
  pr,
  role,
  mainCommit,
  headCommit,
  expectedTreeSha,
}) {
  return Boolean(
    role?.kind === 'integration' &&
    isIntegrationBranch(pr.base?.ref) &&
    pr.head?.ref === `sync/${role.parent}-main` &&
    pr.head?.repo?.full_name &&
    pr.head.repo.full_name === pr.base?.repo?.full_name &&
    pr.base?.sha &&
    mainCommit?.sha &&
    headCommit?.sha === pr.head?.sha &&
    expectedTreeSha &&
    headCommit.commit?.tree?.sha === expectedTreeSha &&
    headCommit.parents?.length === 2 &&
    headCommit.parents[0]?.sha === pr.base.sha &&
    headCommit.parents[1]?.sha === mainCommit.sha,
  );
}

/**
 * Delivery stages for a PR into an integration branch: no human review,
 * requirements approval or QA, but a current-commit agent review (or manual
 * Copilot waiver). A repository Copilot pause waives review for child PRs only.
 * There must be no review or merge enforcement changes, except for a verified
 * merge-only sync from protected main. `sharedHead` are the other
 * open PRs with the same head commit or branch; `since` is when the PR's base
 * last changed; `protectedBase` whether the integration branch ruleset is in
 * force on the base.
 */
export function integrationStages({
  pr,
  role,
  files,
  comments,
  waiver,
  sharedHead = [],
  since = 0,
  protectedBase = true,
  mainSync = false,
  copilotReviewPaused = false,
}) {
  if (role.kind === 'invalid') return [role.reason];
  const reasons = [];
  // Without the ruleset, child-verify and Delivery stages are not required
  // for the merge, and pushes could bypass review.
  if (!protectedBase)
    reasons.push(
      `${pr.base.ref} is not protected by the integration branch ruleset yet; install it first.`,
    );
  // The status belongs to the commit: the lenient pass must not reach another
  // PR, for instance one into main, with the same head.
  if (sharedHead.length)
    reasons.push(
      `PRs ${sharedHead.map((other) => `#${other.number}`).join(', ')} share this head; a PR into an integration branch needs its own head.`,
    );
  if (pr.draft) reasons.push('PR is still a draft.');
  const paths = files.flatMap((file) =>
    [file.filename, file.previous_filename].filter(Boolean),
  );
  if (!mainSync && paths.some((path) => ENFORCEMENT_PATHS.test(path)))
    reasons.push(
      `Review and merge enforcement changes cannot go through ${pr.base.ref}; open them against main.`,
    );
  const reviewSkipped =
    role.kind === 'child' && copilotReviewPaused && !mainSync;
  if (
    !mainSync &&
    !waiver &&
    !reviewSkipped &&
    !agentReviewPassed({
      // A verdict from before the latest retarget reviewed another base.
      comments: comments.filter((c) => Date.parse(c.created_at) > since),
      pr: pr.number,
      sha: pr.head.sha,
      issue: role.issue,
    })
  )
    reasons.push(
      `Independent agent review has not passed for issue #${role.issue} on this commit.`,
    );
  return reasons;
}

/**
 * Extra conditions for a parent PR, from an integration branch into main. It
 * becomes eligible only once the integration work is finished: the parent
 * issue has a completed frontend and backend sub-issue, every sub-issue is
 * closed and nothing is still open against the integration branch. `issues` are
 * its linked issues as for `integrationRole`, with `subIssues` (`{ number,
 * state, stateReason, labels }`); `openInto` are the open PRs whose base is the
 * PR's head branch.
 */
export function parentReasons({
  pr,
  issues,
  closingIssueNumbers = [],
  openInto,
}) {
  const head = pr.head.ref;
  if (!isParentPr(pr)) return [];
  // GitHub replaces an issue's linked-branch entry with the linked PR after a
  // PR is opened from that branch; this PR's own closing link stands in.
  const owners = issues.filter((issue) =>
    ownsIntegrationBranch(issue, head, closingIssueNumbers),
  );
  if (owners.length !== 1)
    return [
      `A PR from ${head} must link the one parent issue that links that branch.`,
    ];
  const [parent] = owners;
  const reasons = [];
  for (const area of ['frontend', 'backend']) {
    // A sub-issue with both area labels delivers neither side: like a child
    // PR's sub-issue, each side needs its own.
    const subs = parent.subIssues.filter((sub) => {
      const areas = areasOf(sub);
      return areas.length === 1 && areas[0] === area;
    });
    if (!subs.length)
      reasons.push(
        `Parent issue #${parent.number} needs a sub-issue labeled only area:${area}.`,
      );
    // A sub-issue closed as not planned does not deliver its side.
    else if (
      !subs.some(
        (sub) => sub.state === 'CLOSED' && sub.stateReason === 'COMPLETED',
      )
    )
      reasons.push(
        `Parent issue #${parent.number} has no completed area:${area} sub-issue.`,
      );
  }
  const open = parent.subIssues.filter((sub) => sub.state !== 'CLOSED');
  if (open.length)
    reasons.push(
      `Sub-issues ${open.map((sub) => `#${sub.number}`).join(', ')} of #${parent.number} are still open.`,
    );
  if (openInto.length)
    reasons.push(
      `PRs ${openInto.map((other) => `#${other.number}`).join(', ')} into ${head} are still open.`,
    );
  return reasons;
}
