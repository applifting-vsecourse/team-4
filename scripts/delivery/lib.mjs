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

// David or Bogdan may approve the current commit; one approval is enough and
// nobody approves their own PR, so on Bogdan's PR it is David's to give.
export const TECHNICAL_APPROVERS = [PM, TECHNICAL_REVIEWER];
export function technicalReviewApproval(pr, reviews) {
  const author = pr.user.login.toLowerCase();
  return (
    TECHNICAL_APPROVERS.filter((login) => login.toLowerCase() !== author)
      .map((login) => latestReview(reviews, login))
      .find((review) => approved(review, pr.head.sha)) ?? null
  );
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

// The record which starts agent review. Standard and Low work needs no scope
// approval, so it is the requirements record itself. High work is reviewed by
// the agent and the human code reviewers first and asks for scope approval
// afterwards, so its review starts under an id which does not wait for it.
export function reviewStartApproval(pr, reviews) {
  const approval = requirementsApproval(pr, reviews);
  if (pr.draft || severityFor(pr) !== 'high') return approval;
  return {
    id: `severity-high-review${pr.requirementsVersion ? ':' + pr.requirementsVersion : ''}`,
    exempt: true,
    commit_id: pr.head.sha,
  };
}

export function requirementsMarker(pr, sha, issue, reviewId) {
  return `<!-- requirements-ready pr=${pr} sha=${sha} issue=${issue} review=${reviewId} -->`;
}

export function requirementsRecord({ comments, pr, sha, issue, approval }) {
  const marker = requirementsMarker(pr, sha, issue, approval.id);
  return comments.findLast(
    (c) =>
      c.user?.login === 'github-actions[bot]' &&
      (c.body ?? '').startsWith(marker + '\n') &&
      (approval.exempt ||
        Date.parse(c.created_at) >= Date.parse(approval.submitted_at)),
  );
}

export function requirementsRecordPredatesReview(record, reviewedAt) {
  return Date.parse(record.created_at) < Date.parse(reviewedAt);
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
    reviewStartApproval(pr, reviews),
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

const verdictPrefix = ({ pr, sha, issue }) =>
  `<!-- agent-review-scope issue=${issue} -->\n<!-- agent-review pr=${pr} sha=${sha} result=`;

/** The latest bot-authored agent review verdict for this PR commit and issue. */
export function agentVerdict({ comments, pr, sha, issue }) {
  const prefix = verdictPrefix({ pr, sha, issue });
  return comments
    .filter(
      (c) =>
        c.user?.login === 'github-actions[bot]' &&
        (c.body ?? '').startsWith(prefix),
    )
    .at(-1);
}

/** Whether that latest verdict is a pass. */
export function agentReviewPassed({ comments, pr, sha, issue }) {
  return (agentVerdict({ comments, pr, sha, issue })?.body ?? '').startsWith(
    verdictPrefix({ pr, sha, issue }) + 'pass ',
  );
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
      `Technical review approval by ${TECHNICAL_APPROVERS.map((login) => `@${login}`).join(' or ')} is missing for this commit.`,
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
    const scoped = Object.hasOwn(issue, 'requirements')
      ? {
          ...pr,
          requirements: issue.requirements,
          requirementsVersion: issue.requirementsVersion,
        }
      : pr;
    const pm = requirementsApproval(scoped, reviews);
    // High severity requires scope approval; Standard records a policy skip.
    if (!pm) {
      reasons.push(
        `Issue #${issue.number} needs requirements approval by ${roles.requirements}.`,
      );
      continue;
    }
    const markerFor = (approval) =>
      requirementsRecord({
        comments,
        pr: pr.number,
        sha,
        issue: issue.number,
        approval,
      });
    // Agent review starts from this record; scope approval is recorded after it.
    const requirement = markerFor(pm);
    const start =
      severity === 'high'
        ? markerFor(reviewStartApproval(scoped, reviews))
        : requirement;
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
    const verdict = agentVerdict({
      comments,
      pr: pr.number,
      sha,
      issue: issue.number,
    });
    const reviewedAt = waiver?.at ?? verdict?.created_at;
    if (
      !waiver &&
      (!verdict ||
        (start &&
          Date.parse(verdict.created_at) < Date.parse(start.created_at)) ||
        !agentReviewPassed({
          comments,
          pr: pr.number,
          sha,
          issue: issue.number,
        }))
    ) {
      reasons.push(
        `Independent agent review has not passed for issue #${issue.number} on this commit.`,
      );
    }
    if (
      !storybookPreview &&
      approved(qa, qaSha) &&
      Date.parse(qa.submitted_at) <= Date.parse(reviewedAt)
    ) {
      reasons.push(
        `QA must approve after the latest agent review or manual waiver for issue #${issue.number}.`,
      );
    }
    if (
      severity === 'high' &&
      requirement &&
      requirementsRecordPredatesReview(requirement, reviewedAt)
    ) {
      reasons.push(
        `Requirements approval for issue #${issue.number} must be recorded after agent review of this commit.`,
      );
    }
    if (
      requirementRecordRequired &&
      (!start ||
        !requirement ||
        (!storybookPreview &&
          (!ready ||
            Date.parse(ready.created_at) < Date.parse(requirement.created_at))))
    ) {
      reasons.push(
        !start
          ? `Issue #${issue.number} has not entered code review.`
          : !requirement
            ? `Issue #${issue.number} has not recorded requirements approval after code review.`
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
