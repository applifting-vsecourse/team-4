# Review, testing and merge

A reviewer request asks David to check whether the developer understood the issue.
It is not permission to skip technical review or QA.

## Developer

Open a PR targeting `main`, link every implemented issue with `Closes #N`, request
the requirements reviewer (see substitutes below). Keep the issue **In Progress**
when opening or updating the PR. Creating a PR or requesting review does not
advance it, except for PRs authored by `darebakdavca`: their requirements review
is explicitly exempt, so they may enter Ready for Code Review immediately.
Keep the PR open through review and testing. Do not merge to obtain a QA build:
QA needs a preview/test environment for the PR commit before merging.

## Requirements and independent code review

David (`darebakdavca`) submits an approving GitHub review after checking intent and
scope. The independent agent reviews each linked issue against the current PR
commit. Requirements approval comes first: once every linked PR is approved
for its current commit, the bot moves the issue from In Progress to **Ready for
Code Review** and records a requirements handoff tied to the approving review.
Only then may Copilot run. Findings or agent errors keep the issue in code review. All PRs linked to an issue must pass both reviews before the automation
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
for ordinary PRs. David's PRs are exempt from requirements review and need only
Matej's QA approval after independent agent review and the testing handoff. On Matej's PRs,
David covers both. The substitute submits two separate approving reviews on the
same commit: first requirements, then QA after the testing handoff. One approval
cannot satisfy both stages. Self-approval never counts. No bypass actors are configured.

Checks refresh on PR changes, completion of agent review, manual dispatch and a
five-minute fallback schedule (GitHub can delay scheduled runs). Submitted or
dismissed PR reviews also trigger both workflows, using trusted code from main. Until then, do not rely on an old displayed check; native
GitHub review restrictions also apply. A new commit cannot reuse a previous
commit's successful check.

Moving a board card does not produce a successful check or bypass requirements.
A push, requirements changes requested, dismissal, or a draft PR returns linked
active issues to **In Progress** until all current heads are approved again.
New approvals create a fresh handoff cycle; old agent and QA evidence from before
that cycle cannot pass the gate. The bot also checks issues in Ready for Testing
and open issues in Done/Accepted by PO to detect invalidated approvals. It
preserves unrelated manual status changes detected during processing.
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
| darebakdavca | Exempt (PR author)  | MatejKrones (after handoff)    |
| MatejKrones  | darebakdavca        | darebakdavca (second approval) |
| Anyone else  | darebakdavca        | MatejKrones                    |

The first review checks scope and intent and unlocks Ready for Code Review. The second review records completed
QA after the bot's testing handoff; do not combine them into one approval.

## Author exemption

Only the actual GitHub PR author `darebakdavca` is exempt from requirements
review (case-insensitive username comparison). Assignees, commit authors and
review requests do not grant this exemption. Draft PRs remain blocked. The bot
records an explicit author exemption for each linked issue and current commit;
it never manufactures a human approval. Matej must still approve QA after the
agent pass and testing handoff. New commits require fresh agent review and QA,
but do not require requirements approval on David-authored PRs. In a multi-PR
issue, other authors' PRs still need requirements approval before the issue
advances. GitHub's approval minimum remains one for the required QA reviewer.
