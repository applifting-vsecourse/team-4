import { severityFor } from './severity.mjs';
import { copilotWaiver, waiverMarker } from './copilot-waiver.mjs';

export const PM = 'darebakdavca';
export const REQUIREMENTS_APPROVERS = [PM, 'rmnskb'];
export const isRequirementsApprover = (login) =>
  REQUIREMENTS_APPROVERS.some(
    (name) => name.toLowerCase() === login?.toLowerCase(),
  );
export const QA = 'MatejKrones';
export const TECHNICAL_REVIEWER = 'rmnskb';
export const TECHNICAL_REVIEW_LABEL = 'technical-review';

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

export function technicalReviewRequired(pr, timeline = []) {
  if (
    pr.labels?.some((label) => label.name === TECHNICAL_REVIEW_LABEL) ??
    false
  )
    return true;
  return timeline.some(
    (event) =>
      event.event === 'labeled' && event.label?.name === TECHNICAL_REVIEW_LABEL,
  );
}

// The technical reviewer's own PR needs no technical approval: GitHub doesn't
// let him approve it, and the change already has his technical sign-off. The
// other gates (Copilot review, requirements, QA) still apply.
export function technicalReviewApproval(pr, reviews) {
  if (pr.user.login.toLowerCase() === TECHNICAL_REVIEWER.toLowerCase())
    return {
      id: 'technical-reviewer-author',
      exempt: true,
      commit_id: pr.head.sha,
    };
  const review = latestReview(reviews, TECHNICAL_REVIEWER);
  return approved(review, pr.head.sha) ? review : null;
}

export function isStorybookPreview(pr) {
  return (
    pr.labels?.some((label) => label.name === 'design:storybook-preview') ??
    false
  );
}

export function storybookPreviewApproval(pr, reviews) {
  return REQUIREMENTS_APPROVERS.map((login) => latestReview(reviews, login))
    .filter(
      (review) =>
        review?.user?.login.toLowerCase() !== pr.user.login.toLowerCase(),
    )
    .find((review) => approved(review, pr.head.sha));
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

// `qaFrom` ({ review, sha, number }) lets a stacked PR take its QA from the
// stack tip: the tip contains this PR, so one approval of the tip commit covers
// the whole stack. Everything else is still judged on this PR's own head.
export function evaluate({ pr, issues, reviews, comments, qaFrom }) {
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
  const needsTechnicalReview = Object.hasOwn(pr, 'technicalReviewRequired')
    ? pr.technicalReviewRequired
    : technicalReviewRequired(pr);
  const technicalApproval = needsTechnicalReview
    ? technicalReviewApproval(pr, reviews)
    : null;
  const qa = qaFrom ? qaFrom.review : latestReview(reviews, roles.qa);
  const qaSha = qaFrom?.sha ?? sha;
  const storybookPreview = isStorybookPreview(pr);
  const previewApproval = storybookPreview
    ? storybookPreviewApproval(pr, reviews)
    : null;
  const waiver = copilotWaiver({ pr, comments });
  if (pr.draft) reasons.push('PR is still a draft.');
  if (!issues.length)
    reasons.push('Link at least one issue with Closes #N or Refs #N.');
  if (needsTechnicalReview && !technicalApproval)
    reasons.push(
      `Technical review approval by @${TECHNICAL_REVIEWER} is missing for this commit.`,
    );
  if (!storybookPreview && !approved(qa, qaSha))
    reasons.push(
      qaFrom
        ? `QA approval by ${qaFrom.owner ?? roles.qa} is missing for the stack tip #${qaFrom.number}.`
        : `QA approval by ${roles.qa} is missing for this commit.`,
    );
  if (storybookPreview && !previewApproval)
    reasons.push(
      `Storybook preview needs current-commit approval by ${REQUIREMENTS_APPROVERS.join(' or ')}.`,
    );
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
    const requirementRecordRequired = severity === 'high' || !storybookPreview;
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
        (requirement &&
          Date.parse(verdict.created_at) <
            Date.parse(requirement.created_at)) ||
        !(verdict.body ?? '').startsWith(
          `<!-- agent-review-scope issue=${issue.number} -->\n<!-- agent-review pr=${pr.number} sha=${sha} result=pass `,
        ))
    ) {
      reasons.push(
        `Independent agent review has not passed for issue #${issue.number} on this commit.`,
      );
    }
    if (
      !storybookPreview &&
      approved(qa, qaSha) &&
      (waiver || verdict) &&
      Date.parse(qa.submitted_at) <=
        Date.parse(waiver?.at ?? verdict.created_at)
    ) {
      reasons.push(
        `QA must approve after the latest agent review or manual waiver for issue #${issue.number}.`,
      );
    }
    if (
      requirementRecordRequired &&
      (!requirement ||
        (!storybookPreview &&
          (!ready ||
            Date.parse(ready.created_at) < Date.parse(requirement.created_at))))
    ) {
      reasons.push(
        !requirement
          ? `Issue #${issue.number} has not entered code review after current requirements approval.`
          : `Issue #${issue.number} has not passed requirements and agent review into Ready for Testing.`,
      );
    } else if (!storybookPreview && requirement && pm && approved(qa, qaSha)) {
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
