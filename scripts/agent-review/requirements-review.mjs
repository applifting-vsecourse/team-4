import { severityFor } from '../delivery/severity.mjs';
import {
  requirementsApproval,
  requirementsReviewerFor,
} from '../delivery/lib.mjs';

export function requirementsRequestMarker(pr, sha, issue) {
  return `<!-- requirements-review-request pr=${pr} sha=${sha} issue=${issue} -->`;
}

/** Keep the assigned requirements approver and the PR handoff comment in sync. */
export async function ensureRequirementsReviewRequest({
  api,
  repo,
  pr,
  issue,
  dryRun,
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
  const current = await api(path);
  current.requirements = issue.requirements;
  current.requirementsVersion = issue.requirementsVersion;
  let severity;
  try {
    severity = severityFor(current);
  } catch {
    log(
      `Requirements review request skipped for #${pr.number}: severity is no longer valid`,
    );
    return 'stale';
  }
  if (
    current.head.sha !== pr.head.sha ||
    current.state !== 'open' ||
    current.draft ||
    current.base.ref !== 'main' ||
    severity !== 'high' ||
    requirementsApproval(current, reviews)
  ) {
    log(
      `Requirements review request skipped for #${pr.number}: PR is no longer eligible`,
    );
    return 'stale';
  }

  const reviewer = requirementsReviewerFor(current.user.login);
  const marker = requirementsRequestMarker(
    current.number,
    current.head.sha,
    issue.number,
  );
  if (dryRun) {
    log(
      `[dry-run] would request requirements approval from @${reviewer} on #${pr.number}`,
    );
    return 'dry-run';
  }

  if (
    !comments.some(
      (comment) =>
        comment.user?.login === 'github-actions[bot]' &&
        (comment.body ?? '').startsWith(marker + '\n'),
    )
  ) {
    await api(`/repos/${repo}/issues/${pr.number}/comments`, {
      method: 'POST',
      body: {
        body: `${marker}\nAgent and code review passed for commit \`${current.head.sha}\`. @${reviewer}, please approve this PR for issue requirements. You can submit an approving review or comment \`/requirements-approve\`. QA handoff is paused until approval is recorded.`,
      },
    });
  }

  for (let page = 1; ; page++) {
    const pending = await api(
      `${path}/requested_reviewers?per_page=100&page=${page}`,
    );
    if (
      pending.users.some(
        (user) => user.login.toLowerCase() === reviewer.toLowerCase(),
      )
    )
      return 'pending';
    if (pending.users.length + pending.teams.length < 100) break;
  }
  await api(`${path}/requested_reviewers`, {
    method: 'POST',
    body: { reviewers: [reviewer] },
  });
  log(`Requested requirements approval from @${reviewer} on #${pr.number}`);
  return 'requested';
}
