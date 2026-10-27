import { severityFor } from './severity.mjs';
import { copilotWaiver, waiverMarker } from './copilot-waiver.mjs';

export const PM = 'darebakdavca';
export const REQUIREMENTS_APPROVERS = [PM, 'rmnskb'];
export const isRequirementsApprover = (login) =>
  REQUIREMENTS_APPROVERS.some(
    (name) => name.toLowerCase() === login?.toLowerCase(),
  );
export const QA = 'MatejKrones';

export function reviewersFor(author) {
  const login = author.toLowerCase();
  return {
    requirements: REQUIREMENTS_APPROVERS.join(' or '),
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

export function requirementsApproval(pr, reviews) {
  if (pr.draft) return null;
  if (severityFor(pr) !== 'high')
    return {
      id: `severity-${severityFor(pr)}${pr.requirementsVersion ? ':' + pr.requirementsVersion : ''}`,
      exempt: true,
      commit_id: pr.head.sha,
    };
  if (Object.hasOwn(pr, 'requirements')) return pr.requirements;
  const ordered = reviews
    .filter(
      (r) =>
        isRequirementsApprover(r.user?.login) &&
        r.user.login.toLowerCase() !== pr.user.login.toLowerCase(),
    )
    .filter((r) => !['COMMENTED', 'PENDING'].includes(r.state))
    .sort((a, b) => a.id - b.id);
  if (ordered.at(-1)?.state !== 'APPROVED') return null;
  const reset =
    ordered
      .filter((r) => ['CHANGES_REQUESTED', 'DISMISSED'].includes(r.state))
      .at(-1)?.id ?? 0;
  return ordered.find((r) => r.id > reset && r.state === 'APPROVED') ?? null;
}

export function requirementsMarker(pr, sha, issue, reviewId) {
  return `<!-- requirements-ready pr=${pr} sha=${sha} issue=${issue} review=${reviewId} -->`;
}

export function requirementsTransition(status, prs) {
  if (!prs.length)
    return {
      status: ['Ready for Code Review', 'Ready for Testing'].includes(status)
        ? 'In Progress'
        : status,
      review: false,
    };
  const passed = prs.every(({ pr, reviews }) =>
    requirementsApproval(pr, reviews),
  );
  if (!passed) return { status: 'In Progress', review: false };
  if (
    ['In Progress', 'Ready for Code Review', 'Ready for Testing'].includes(
      status,
    )
  ) {
    return {
      status: status === 'In Progress' ? 'Ready for Code Review' : status,
      review: true,
    };
  }
  return { status, review: false };
}

export function readyMarker(pr, sha, issue) {
  return `<!-- delivery-ready pr=${pr} sha=${sha} issue=${issue} -->`;
}

export function evaluate({ pr, issues, reviews, comments }) {
  const reasons = [];
  let severity;
  try {
    severity = severityFor(pr);
  } catch (error) {
    return { pass: false, reasons: [error.message] };
  }
  if (severity === 'low')
    return {
      pass: !pr.draft,
      reasons: pr.draft ? ['PR is still a draft.'] : [],
    };
  const sha = pr.head.sha;
  const roles = reviewersFor(pr.user.login);
  const qa = latestReview(reviews, roles.qa);
  const waiver = copilotWaiver({ pr, comments });
  if (pr.draft) reasons.push('PR is still a draft.');
  if (!issues.length) reasons.push('Link at least one issue with Closes #N.');
  if (!approved(qa, sha))
    reasons.push(`QA approval by ${roles.qa} is missing for this commit.`);
  for (const issue of issues) {
    const pm = requirementsApproval(
      Object.hasOwn(issue, 'requirements')
        ? {
            ...pr,
            requirements: issue.requirements,
            requirementsVersion: issue.requirementsVersion,
          }
        : pr,
      reviews,
    );
    // High severity requires scope approval; Standard records a policy skip.
    if (!pm) {
      reasons.push(
        `Issue #${issue.number} needs requirements approval by ${roles.requirements}.`,
      );
      continue;
    }
    const requirement = pm
      ? comments
          .filter(
            (c) =>
              c.user?.login === 'github-actions[bot]' &&
              (c.body ?? '').startsWith(
                requirementsMarker(pr.number, sha, issue.number, pm.id) + '\n',
              ) &&
              (pm.exempt ||
                Date.parse(c.created_at) >= Date.parse(pm.submitted_at)),
          )
          .at(-1)
      : null;
    if (!requirement) {
      reasons.push(
        `Issue #${issue.number} has not entered code review after current requirements approval.`,
      );
      continue;
    }
    // A fresh, bot-authored readiness record proves requirements and agent
    // review passed together before QA. A board column alone proves nothing.
    const ready = comments
      .filter(
        (c) =>
          c.user?.login === 'github-actions[bot]' &&
          (c.body ?? '').startsWith(
            readyMarker(pr.number, sha, issue.number) +
              '\n' +
              (waiver ? waiverMarker(waiver) + '\n' : ''),
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
      !waiver &&
      (!verdict ||
        Date.parse(verdict.created_at) < Date.parse(requirement.created_at) ||
        !(verdict.body ?? '').startsWith(
          `<!-- agent-review-scope issue=${issue.number} -->\n<!-- agent-review pr=${pr.number} sha=${sha} result=pass `,
        ))
    ) {
      reasons.push(
        `Independent agent review has not passed for issue #${issue.number} on this commit.`,
      );
    }
    if (
      approved(qa, sha) &&
      (waiver || verdict) &&
      Date.parse(qa.submitted_at) <=
        Date.parse(waiver?.at ?? verdict.created_at)
    ) {
      reasons.push(
        `QA must approve after the latest agent review or manual waiver for issue #${issue.number}.`,
      );
    }
    if (
      !ready ||
      !requirement ||
      Date.parse(ready.created_at) < Date.parse(requirement.created_at)
    ) {
      reasons.push(
        `Issue #${issue.number} has not passed requirements and agent review into Ready for Testing.`,
      );
    } else if (pm && approved(qa, sha)) {
      if (
        Date.parse(qa.submitted_at) <= Date.parse(ready.created_at) ||
        (!pm.exempt &&
          Date.parse(qa.submitted_at) <= Date.parse(pm.submitted_at))
      ) {
        reasons.push(
          `QA must approve after requirements and agent review for issue #${issue.number}.`,
        );
      }
    }
  }
  return { pass: reasons.length === 0, reasons };
}
