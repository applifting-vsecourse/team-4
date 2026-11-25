// Who may ask for a Copilot review, and how (#499). The workflow only
// pre-filters comments; review-pr.mjs decides with these rules.

/** People with access to the repository; anyone else's comment is ignored. */
const TRUSTED = ['OWNER', 'MEMBER', 'COLLABORATOR'];

/** `/review` alone on the comment's first line, e.g. not "/reviewed, LGTM". */
export const isReviewCommand = (body) =>
  /^\/review[ \t]*(?:\r?\n|$)/.test(body ?? '');

/** Whether a PR comment asks for a review that should run. */
export function reviewRequested({ body, association, isPullRequest }) {
  if (!isPullRequest) return { run: false, reason: 'not a pull request' };
  if (!isReviewCommand(body)) return { run: false, reason: 'not /review' };
  if (!TRUSTED.includes(association))
    return { run: false, reason: `no repository access (${association})` };
  return { run: true, reason: '/review by someone with access' };
}
