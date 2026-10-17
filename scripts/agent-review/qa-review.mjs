import { copilotWaiver, waiverMarker } from '../delivery/copilot-waiver.mjs';
import {
  evaluate,
  readyMarker,
  requirementsApproval,
  reviewersFor,
} from '../delivery/lib.mjs';

/** Reconcile the QA request independently of whether the handoff comment is new. */
export async function ensureQaReviewRequest({
  api,
  repo,
  pr,
  issue,
  dryRun,
  waiver,
  log = console.log,
}) {
  const path = `/repos/${repo}/pulls/${pr.number}`;
  const list = async (url) => {
    const all = [];
    for (let page = 1; ; page++) {
      const batch = await api(`${url}?per_page=100&page=${page}`);
      all.push(...batch);
      if (batch.length < 100) return all;
    }
  };
  const reviews = await list(`${path}/reviews`);
  const comments = await list(`/repos/${repo}/issues/${pr.number}/comments`);
  // Re-read after loading review evidence: never request QA for a stale head,
  // draft, closed PR or a PR no longer targeting main.
  const current = await api(path);
  current.requirements = issue.requirements;
  current.requirementsVersion = issue.requirementsVersion;
  if (
    copilotWaiver({ pr: current, comments })?.source !== waiver?.source ||
    current.head.sha !== pr.head.sha ||
    current.state !== 'open' ||
    current.draft ||
    current.base.ref !== 'main' ||
    !requirementsApproval(current, reviews)
  ) {
    log(`QA request skipped for #${pr.number}: PR is no longer eligible`);
    return 'stale';
  }
  const reviewer = reviewersFor(current.user.login).qa;
  if (evaluate({ pr: current, issues: [issue], reviews, comments }).pass)
    return 'approved';

  if (dryRun) {
    log(`[dry-run] would request QA review from @${reviewer} on #${pr.number}`);
    return 'dry-run';
  }
  // A failed handoff write must not turn into a premature request. The caller
  // reaches here only after all linked PRs have passed the final scope/head check.
  if (
    !comments.some(
      (c) =>
        c.user?.login === 'github-actions[bot]' &&
        (c.body ?? '').startsWith(
          readyMarker(pr.number, pr.head.sha, issue.number) +
            '\n' +
            (waiver ? waiverMarker(waiver) + '\n' : ''),
        ),
    )
  )
    throw new Error(`QA handoff record missing for PR #${pr.number}`);

  for (let page = 1; ; page++) {
    const pending = await api(
      `${path}/requested_reviewers?per_page=100&page=${page}`,
    );
    if (
      pending.users.some(
        (u) => u.login.toLowerCase() === reviewer.toLowerCase(),
      )
    )
      return 'pending';
    if (pending.users.length + pending.teams.length < 100) break;
  }
  await api(`${path}/requested_reviewers`, {
    method: 'POST',
    body: { reviewers: [reviewer] },
  });
  log(`Requested QA review from @${reviewer} on #${pr.number}`);
  return 'requested';
}
