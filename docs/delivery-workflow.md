# Review, testing and merge

A reviewer request asks David to check whether the developer understood the issue.
It is not permission to skip technical review or QA.

## Developer

Open a PR targeting `main`, link every implemented issue with `Closes #N`, request
`darebakdavca` as reviewer, and move the linked issues to **Ready for Code Review**.
Keep the PR open through review and testing. Do not merge to obtain a QA build:
QA needs a preview/test environment for the PR commit before merging.

## Requirements and independent code review

David (`darebakdavca`) submits an approving GitHub review after checking intent and
scope. The independent agent reviews each linked issue against the current PR
commit. These reviews may happen in parallel. Findings or agent errors block the
handoff. All PRs linked to an issue must pass both reviews before the automation
moves that issue to **Ready for Testing** and posts a handoff record on each PR.

## QA

Matej (`MatejKrones`) tests the exact commit identified in the handoff comment.
After a successful test, submit an **Approve** review on that PR. For failures,
submit **Request changes** and describe the problem. An approval before the
handoff does not count: approve again after testing. A label or manual board move
is not QA evidence and cannot unlock merging.

## Merge

The required **Delivery stages** check validates both named reviewers, independent
agent results for every closing issue, and the testing handoff before QA approval.
The required **verify** check covers CI. GitHub also requires at least one approval,
resolved review threads, and an up-to-date branch. New commits require fresh
approvals, fresh agent review and a fresh QA handoff. The named requirements and QA approvals are still enforced by Delivery stages
for ordinary PRs. On David's PRs, Matej covers requirements and QA; on Matej's PRs,
David covers both. The substitute submits two separate approving reviews on the
same commit: first requirements, then QA after the testing handoff. One approval
cannot satisfy both stages. Self-approval never counts. No bypass actors are configured.

Checks refresh on PR changes, completion of agent review, manual dispatch and a
five-minute schedule (GitHub can delay scheduled runs). Review changes are picked
up on the next refresh. Until then, do not rely on an old displayed check; native
GitHub review restrictions also apply. A new commit cannot reuse a previous
commit's successful check.

Moving a board card does not produce a successful check. If code changes after
an issue leaves Ready for Testing, return it to Ready for Code Review. The bot
also retries issues still in Ready for Testing to recover transient errors.
The board's Done/Accepted by PO columns remain reporting stages; no new approval
requirement is inferred from their names.

## Trusted execution and operation

The stage evaluator and agent run trusted code from `main`; PR code is never
executed with their write tokens. CI has read-only repository access. CODEOWNERS
requires David or Matej's review for enforcement code and workflow changes; the
stage evaluator selects the correct independent reviewer based on the author. GitHub Actions
(app ID 15368) is the required check source. Repository administrators can still
edit repository rules; this is protection against merging through the normal
workflow, not against an administrator deliberately disabling protection.

The existing `PROJECT_AUTOMATION_TOKEN` and `COPILOT_GITHUB_TOKEN` secrets are
required by agent review. Missing secrets, quota failures or API errors must not
produce a pass. Stage evaluation requires only the workflow's `GITHUB_TOKEN`.

Run `pnpm agent-review:test` for the review and merge-gate decision tests.

## Bootstrap

The enforcement rule is enabled before installation, so normal merges are already
blocked. This setup PR cannot review itself using a workflow absent from main.
It must receive independent setup review and QA. A one-time, explicitly approved
installation procedure is required; do not silently disable the gate or invent
passing evidence. After installation, verify a blocked PR and a complete staged
pass on GitHub before calling the end-to-end workflow validated.

## Reciprocal substitutes

| PR author    | Requirements review | QA after handoff               |
| ------------ | ------------------- | ------------------------------ |
| darebakdavca | MatejKrones         | MatejKrones (second approval)  |
| MatejKrones  | darebakdavca        | darebakdavca (second approval) |
| Anyone else  | darebakdavca        | MatejKrones                    |

The first review checks scope and intent. The second review records completed
QA after the bot's testing handoff; do not combine them into one approval.
