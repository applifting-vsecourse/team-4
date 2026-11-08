import {
  TECHNICAL_REVIEWER,
  technicalReviewApproval,
  technicalReviewRequired,
} from '../delivery/lib.mjs';

/** Request the named reviewer as soon as a technical-review PR is ready for review. */
export async function ensureTechnicalReviewRequest({
  api,
  repo,
  pr,
  requiredByHistory,
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
  const current = await api(path);
  if (
    current.head.sha !== pr.head.sha ||
    current.state !== 'open' ||
    current.draft ||
    current.base.ref !== 'main'
  ) {
    log(
      `Technical review request skipped for #${pr.number}: PR is no longer eligible`,
    );
    return 'stale';
  }
  const timeline = requiredByHistory
    ? []
    : await list(`/repos/${repo}/issues/${pr.number}/timeline`);
  if (!requiredByHistory && !technicalReviewRequired(current, timeline))
    return 'not-required';
  const reviews = await list(`${path}/reviews`);
  const approval = technicalReviewApproval(current, reviews);
  if (approval?.exempt) {
    log(
      `Technical review for #${pr.number} not requested: @${TECHNICAL_REVIEWER} authored the PR`,
    );
    return 'exempt';
  }
  if (approval) return 'approved';
  if (dryRun) {
    log(
      `[dry-run] would request technical review from @${TECHNICAL_REVIEWER} on #${pr.number}`,
    );
    return 'dry-run';
  }
  for (let page = 1; ; page++) {
    const pending = await api(
      `${path}/requested_reviewers?per_page=100&page=${page}`,
    );
    if (
      pending.users.some(
        (user) => user.login.toLowerCase() === TECHNICAL_REVIEWER.toLowerCase(),
      )
    )
      return 'pending';
    if (pending.users.length + pending.teams.length < 100) break;
  }
  await api(`${path}/requested_reviewers`, {
    method: 'POST',
    body: { reviewers: [TECHNICAL_REVIEWER] },
  });
  log(
    `Requested technical review from @${TECHNICAL_REVIEWER} on #${pr.number}`,
  );
  return 'requested';
}
