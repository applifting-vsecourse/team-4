export const PM = 'darebakdavca';
export const QA = 'MatejKrones';

export function reviewersFor(author) {
  const login = author.toLowerCase();
  return {
    requirements: login === PM.toLowerCase() ? QA : PM,
    qa: login === QA.toLowerCase() ? PM : QA,
  };
}

export function latestReview(reviews, login) {
  return reviews
    .filter((r) => r.user?.login.toLowerCase() === login.toLowerCase())
    .filter((r) => r.state !== 'COMMENTED' && r.state !== 'PENDING')
    .sort((a, b) => a.id - b.id)
    .at(-1);
}

export function approved(review, sha) {
  return review?.state === 'APPROVED' && review.commit_id === sha;
}

export function readyMarker(pr, sha, issue) {
  return `<!-- delivery-ready pr=${pr} sha=${sha} issue=${issue} -->`;
}

export function evaluate({ pr, issues, reviews, comments }) {
  const reasons = [];
  const sha = pr.head.sha;
  const roles = reviewersFor(pr.user.login);
  const latestPm = latestReview(reviews, roles.requirements);
  // When the same substitute owns both stages, keep the first requirements
  // approval and require a separate later approval after the QA handoff.
  const pm =
    roles.requirements === roles.qa
      ? reviews
          .filter(
            (r) =>
              r.user?.login.toLowerCase() ===
                roles.requirements.toLowerCase() && approved(r, sha),
          )
          .sort((a, b) => a.id - b.id)[0]
      : latestPm;
  const qa = latestReview(reviews, roles.qa);
  if (pr.draft) reasons.push('PR is still a draft.');
  if (!issues.length) reasons.push('Link at least one issue with Closes #N.');
  if (!approved(pm, sha) || !approved(latestPm, sha))
    reasons.push(
      `Requirements approval by ${roles.requirements} is missing for this commit.`,
    );
  if (!approved(qa, sha))
    reasons.push(`QA approval by ${roles.qa} is missing for this commit.`);
  for (const issue of issues) {
    // A fresh, bot-authored readiness record proves requirements and agent
    // review passed together before QA. A board column alone proves nothing.
    const ready = comments
      .filter(
        (c) =>
          c.user?.login === 'github-actions[bot]' &&
          (c.body ?? '').startsWith(
            readyMarker(pr.number, sha, issue.number) + '\n',
          ),
      )
      .at(-1);
    const verdict = comments
      .filter(
        (c) =>
          c.user?.login === 'github-actions[bot]' &&
          (c.body ?? '').startsWith(
            `<!-- agent-review-scope issue=${issue.number} -->\n<!-- agent-review pr=${pr.number} sha=${sha} result=`,
          ) &&
          (c.body ?? '').includes(
            `<!-- agent-review pr=${pr.number} sha=${sha} result=`,
          ),
      )
      .at(-1);
    if (
      !verdict ||
      !(verdict.body ?? '').startsWith(
        `<!-- agent-review-scope issue=${issue.number} -->\n<!-- agent-review pr=${pr.number} sha=${sha} result=pass `,
      )
    ) {
      reasons.push(
        `Independent agent review has not passed for issue #${issue.number} on this commit.`,
      );
    }
    if (
      approved(qa, sha) &&
      verdict &&
      Date.parse(qa.submitted_at) <= Date.parse(verdict.created_at)
    ) {
      reasons.push(
        `QA must approve after the latest agent review for issue #${issue.number}.`,
      );
    }
    if (!ready) {
      reasons.push(
        `Issue #${issue.number} has not passed requirements and agent review into Ready for Testing.`,
      );
    } else if (approved(pm, sha) && approved(qa, sha)) {
      if (
        Date.parse(qa.submitted_at) <= Date.parse(ready.created_at) ||
        Date.parse(qa.submitted_at) <= Date.parse(pm.submitted_at)
      ) {
        reasons.push(
          `QA must approve after requirements and agent review for issue #${issue.number}.`,
        );
      }
    }
  }
  return { pass: reasons.length === 0, reasons };
}
