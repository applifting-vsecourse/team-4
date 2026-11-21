import { closingIssueNumbers } from '../automation/issue-links.mjs';
import { parentReasons } from '../delivery/feature.mjs';

/** Apply parent-PR eligibility rules to the review runner's linked issue data. */
export function parentReviewReasons({ pr, issues, openInto }) {
  return parentReasons({
    pr,
    issues,
    closingIssueNumbers: closingIssueNumbers(pr.body),
    openInto,
  });
}
