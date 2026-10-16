# Review, testing and merge

Requirements approval accepts the issue's product direction and scope. It is not
an approval of every subsequent code edit. Code review and QA independently
check the implementation being merged.

## Requirements

Open a PR targeting main, link the issue with `Closes #N`, and leave its card In
Progress. David (`darebakdavca`) approves requirements through an approving review
on any linked implementation PR, or by posting `/requirements-approve` on the
issue. The bot records that approval on the issue, bound to its title/body and
current scope-review cycle. One issue approval covers its linked implementation
PRs. David's own PRs are exempt; this exemption never approves other authors'
PRs by itself.

Once scope approval is recorded, implementation commits, technical review
findings and GitHub's automatic stale-review dismissal do not invalidate it.
A developer fixing a color token needs fresh code review, not another PM review.
Only an active issue with requirements approval can enter Ready for Code Review.

If the solution changes materially, a repository collaborator posts this as a
standalone issue comment:

```text
/requirements-rereview
```

The bot records the request and returns non-exempt work to In Progress. David
must submit a new requirements approval or `/requirements-approve` afterward.
Deleting the request after the bot has processed it cannot resurrect the old
approval. Editing the issue title/body invalidates its previous scope approval;
old review IDs and commands already consumed cannot approve the changed scope.
Outsiders cannot request re-review, and only David can grant scope approval.

Agent findings that indicate a changed product scope should be assessed by the
team and flagged using the same command. Automation does not infer intent from
arbitrary code changes. Draft PRs remain blocked.

## Code review and QA

For each current PR commit, the bot records that the issue's requirements policy
is satisfied, runs independent Copilot review, and moves the issue to Ready for
Testing only if all linked PRs pass. Each new commit needs fresh agent review and
QA; a previously tested commit cannot approve a replacement commit. A new commit
after QA returns the issue to Code Review without requiring another PM approval
if the issue scope is unchanged.

Matej (`MatejKrones`) tests the exact commit in the testing handoff, then submits
an approving PR review. For Matej-authored PRs, David substitutes for QA. On
David-authored PRs, requirements remain exempt but Matej's QA is still required.
QA must happen after the handoff. A manual board move or early approval is not
QA evidence. Do not merge to obtain a test build: QA needs the PR version before
merge.

| PR author    | Requirements                 | QA after testing handoff |
| ------------ | ---------------------------- | ------------------------ |
| darebakdavca | Exempt for this PR           | MatejKrones              |
| MatejKrones  | David's issue-level approval | darebakdavca             |
| Anyone else  | David's issue-level approval | MatejKrones              |

When David covers both requirements and QA, he approves the issue scope first
and the tested current commit afterward. His scope approval survives later
implementation commits even when GitHub dismisses the old native PR review.

## Reviewer requests and merge rules

Matej is not automatically requested at PR creation. CODEOWNERS lists David only
for workflow/enforcement paths; he is not requested on his own PRs. The bot's
Ready for Testing comment identifies the QA owner; that person may submit QA
approval without an advance reviewer request.

Disable the native `require_code_owner_review` requirement: otherwise a sole
code owner authoring a PR can be blocked by a redundant owner-approval gate.
The named reviewer requirements remain enforced by Delivery stages. GitHub still
requires one current human approval, dismisses stale reviews on pushes, requires
last-push approval and resolved review threads, and enforces up-to-date `verify`
and `Delivery stages` checks from GitHub Actions (app ID 15368). No standing
bypass actors are configured. Do not disable stale-review dismissal: QA must
still approve the current commit.

Workflows run trusted code from main on relevant PR/review events, human issue
comments and issue edits, with five-minute polling as a fallback. Bot comments
are ignored as direct event triggers to avoid self-triggering loops. The stage
checker publishes a blocking check when scope, agent or QA evidence is missing.
A green workflow execution is not the same as a green delivery verdict.

## Configuration and validation

`PROJECT_AUTOMATION_TOKEN` is needed for the board; `COPILOT_GITHUB_TOKEN` is needed
for agent review. The stage checker reads issue scope evidence with its normal
GITHUB_TOKEN. Neither workflow executes PR code with its write token. API,
coverage and model failures must not produce a pass.

Run `pnpm agent-review:test` for automated gate and runner tests. A change to the
workflow itself still requires installation and live validation before claiming
end-to-end proof. Administrators can edit repository rules deliberately; there
is no standing merge bypass for them.
