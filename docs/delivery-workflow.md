# Review, testing and merge

Requirements approval accepts the issue's product direction and scope. It is not
an approval of every subsequent code edit. Code review and QA independently
check the implementation being merged.

## Severity and required gates

The PR author must classify risk and apply exactly one PR label before handing
the PR off: `severity:low`, `severity:standard` or `severity:high`. PR creation
does not infer severity from changed files; if the creation tool cannot set a
label, add it immediately afterward and verify it is present. No severity label
means Standard only as a gate fallback, not as the author's classification.
Multiple or unknown `severity:` labels block merging. Use the highest level in
mixed changes. Collaborators may escalate the label. The gate reads live labels
and re-evaluates on label changes, pushes, reviews and scheduled reconciliation.

| Gate                                     | Low         | Standard (default) | High                              |
| ---------------------------------------- | ----------- | ------------------ | --------------------------------- |
| CI (`verify`)                            | Required    | Required           | Required                          |
| Issue link (`Closes #N` or `Refs #N`)    | Optional    | Required           | Required                          |
| Requirements approval                    | Skipped     | Skipped            | David or Bogdan after code review |
| Independent Copilot code review          | Skipped     | Required           | Required                          |
| Human QA of current commit after handoff | Skipped     | Required           | Required                          |
| Technical approval                       | Not allowed | If labeled         | If labeled                        |
| ADR acceptance, if the PR changes an ADR | Required    | Required           | Required                          |

The `technical-review` PR label is an additional gate for Standard and High PRs. Use it
for a new or replaced Docker Compose service, a newly added package/dependency,
or comparable shared infrastructure/tooling changes that need technical
oversight. Routine feature work such as adding a page does not need it. When
present, the workflow requests an approving review from Bogdan (`rmnskb`) once
CI and the agent review of the current commit have passed, and requires an approval from him or David (`darebakdavca`) on the current commit before moving the issue to Ready for
Testing or allowing merge. The approval is separate from High requirements
approval and from QA; an approval from either may satisfy both applicable review gates.

The technical-review requirement is recorded by the PR's label history. Removing
the label after it was applied does not clear the requirement; a current-commit
approval from `rmnskb` or `darebakdavca` does. Low severity cannot be combined with this label.

Either David (`darebakdavca`) or Bogdan (`rmnskb`) may give the technical
approval on the current commit; one approval is enough and nobody approves their
own PR. The workflow requests only Bogdan, and never David. On a PR `rmnskb`
authored there is no automatic request: he asks David by hand and David's
approval of the current commit satisfies the gate. Copilot review, requirements
approval and QA still apply. The rule follows the PR's author, not each commit's
pusher.

### Storybook design-preview PRs

A PR may use the `design:storybook-preview` label only when it delivers an
isolated UI proposal in Storybook: stories and presentation-only components or
styles. It must not change live routes, application behavior, persistence, or
API integration. The label is a deliberate PR-level classification, not an
automatic inference from changed files. If the PR includes implementation work,
remove the label and use the normal delivery gates.

Preview PRs still require CI, issue linkage, any applicable High requirements
approval, and a successful independent Copilot review for the current commit.
They also require an approving review on that exact commit from David
(`darebakdavca`) or Bogdan (`rmnskb`). That review accepts the Storybook design
and replaces the separate human QA approval for the preview PR. The preview PR
does not receive a QA handoff and does not need a `Ready for Testing` marker.

When every linked open PR for an issue is a passing Storybook preview, automation
returns the open issue to Sprint Backlog after PM approval; it preserves the
issue's iteration, labels, and assignee. If an implementation PR is also linked,
that PR and issue continue through normal QA. The preview PR itself is omitted
from QA requests. A preview-only approval does not close the issue.

The label, Copilot result, and PM review are checked against the current PR
commit. A new commit requires fresh Copilot review and PM approval. Removing the
label restores the normal QA gate. High-severity preview workflow changes still
require the regular High requirements approval; this exception does not bypass
scope review or CI.

Low allows documentation/text files (`.md`, `.txt`) and isolated `.test`/`.spec`
JavaScript/TypeScript files. Application code, configuration, dependency changes
and migrations cannot use Low, even for copy or formatting edits. Removed and
renamed paths are checked too. Changes to `.github/`, delivery/review/automation
scripts, `AGENTS.md`, `CLAUDE.md` or this policy always require High. Draft PRs
never pass. Low linked PRs are excluded from the issue's code-review/QA workflow.
An issue linked only to Low PRs does not receive an automated testing handoff.

Use Standard for routine features, UI work and bug fixes. Use High for
permissions/authentication, payments, destructive operations, migrations,
deployment and approval-workflow changes. File checks enforce the Low boundary
and High for review enforcement; authors and reviewers classify other domain
risks. A label is not an automatic assessment of code behavior.

## Order of checks

Checks on a non-draft PR run in this order, each on the current commit:

1. CI (`verify`) and the independent agent review (or its manual waiver, or a
   review carried over under [Stacked PRs](#stacked-prs) and the integration
   rules). The agent review does not wait for scope approval.
2. Human code review. Only PRs with `technical-review` have it: after step 1
   succeeds the workflow requests `rmnskb`, and never before. A pending,
   failing or blocking agent review sends no request. A new commit restarts
   from step 1: the earlier agent result and code review do not count for it.
   `rmnskb` or `darebakdavca` may approve the current commit (one approval is
   enough, the author cannot approve their own PR); the workflow requests only
   `rmnskb`, never David, and on a PR `rmnskb` authored David approves after a
   manual request.
3. Requirements approval (High only). It is requested once the human code
   review has passed, or immediately after step 1 when the PR has none. An
   approval granted earlier on the issue stays valid. The bot records it after
   the agent review.
4. QA handoff and QA of the current commit, after all of the above.

## Requirements (High only)

Scope approval is asked for after agent and human code review (see
[Order of checks](#order-of-checks)). Open a PR targeting main and link each issue with `Closes #N` if the PR completes
it or `Refs #N` if the PR is partial. `Refs` leaves the issue open. Leave its card In Progress. David
(`darebakdavca`) or Bogdan (`rmnskb`) approves requirements through
an approving review on a linked implementation PR, or `/requirements-approve`
as a standalone comment on the issue or its linked PR. On an open High PR targeting
main, the command approves all linked issues in this repository; a PR without
an issue link grants no approval. One approval from either is sufficient. The bot records approval
on the issue, bound to its title/body and current scope-review cycle. One issue
approval covers its linked High implementation PRs. High has no author exemption;
self-authored PR reviews cannot seed a grant, while explicit issue and PR commands are
available to both product owners, including on their own PRs. Standard enters code review without this grant.

Before opening a non-draft PR, launch a fresh independent agent to review the
final diff. It must not receive the implementation conversation or plan. Give it
the linked issue's description and acceptance criteria, the diff, and only the
repository instructions needed for review. Resolve actionable findings or record
why each is not applicable before opening the PR. If an independent agent cannot
be launched, keep the PR as a draft and report the blocker.

Once scope approval is recorded, implementation commits, technical review
findings and GitHub's automatic stale-review dismissal do not invalidate it.
A developer fixing a color token needs fresh code review, not another PM review.
An active issue enters Ready for Code Review once every linked Standard/High PR satisfies its severity policy.

If the solution changes materially, a repository collaborator posts this as a
standalone issue comment:

```text
/requirements-rereview
```

The bot records the request and returns non-exempt work to In Progress. David or Bogdan
must submit a new requirements approval or `/requirements-approve` afterward.
Deleting the request after the bot has processed it cannot resurrect the old
approval. Editing the issue title or requirement text invalidates its previous scope approval;
old review IDs and commands already consumed cannot approve the changed scope.
Outsiders cannot request re-review, and only David or Bogdan can grant scope approval.

Agent findings that indicate a changed product scope should be assessed by the
team and flagged using the same command. Automation does not infer intent from
arbitrary code changes. Draft PRs remain blocked.

## Code review and QA

For each current PR commit, the bot records that each PR's severity and requirements policy
is satisfied, runs independent Copilot review, and moves the issue to Ready for
Testing only if all linked PRs pass. Each new commit needs fresh agent review and
QA; a previously tested commit cannot approve a replacement commit. A new commit
after QA returns the issue to Code Review without requiring another PM approval
if the issue scope is unchanged.

Stacked PRs are described in [Stacked PRs](#stacked-prs). A PR that targets a
feature branch outside a plain stack still waits for its prerequisite and is
then retargeted to main; it does not prevent linked PRs targeting main from
receiving independent review and their own current-commit QA handoff.
All existing requirements, CI, technical approval and QA gates still apply.

Review each PR against its declared slice, using the linked issue for context. The PR title and `What`/`Why` sections define what that PR claims to deliver. `Refs #N` means partial work, so omitted criteria from the broader issue are not blockers unless the PR claims to implement them or its changes concretely break them. `Closes #N` claims the full issue is complete. A design preview may intentionally use fixtures and inert controls when its description says persistence and backend integration come later; review whether the preview itself is correct and whether it causes concrete regressions. Flag unclear or conflicting scope as a note for clarification rather than silently imposing the full issue scope on every linked PR.

Matej (`MatejKrones`) tests the exact commit in the testing handoff, then submits
an approving PR review. For Matej-authored PRs, David substitutes for QA. On
David-authored Standard/High PRs, Matej's QA is required.
QA must happen after the handoff. A manual board move or early approval is not
QA evidence. Do not merge to obtain a test build: QA needs the PR version before
merge. Use [local QA preparation](local-qa.md); setup instructions are not repeated
in GitHub handoffs. Binary files are excluded from automated text review without
separate approval and listed in coverage; binary-only PRs still need CI and QA.

| PR author    | Requirements                                   | QA after testing handoff |
| ------------ | ---------------------------------------------- | ------------------------ |
| darebakdavca | David or Bogdan for High; skipped for Standard | MatejKrones              |
| MatejKrones  | David or Bogdan for High; skipped for Standard | darebakdavca             |
| Anyone else  | David or Bogdan for High; skipped for Standard | MatejKrones              |

When David covers both requirements and QA, he approves the issue scope first
and the tested current commit afterward. His scope approval survives later
implementation commits even when GitHub dismisses the old native PR review.

## Stacked PRs

A stack is a linear chain of open PRs in one repository where each PR targets the
branch of the PR below it and the bottom PR targets `main`. The workflow judges a
stack as one change: each slice is reviewed on its own, QA happens once on the
tip, and the whole stack merges in one atomic merge. Two PRs on one base, two open PRs from one
branch, a cycle or a fork-based PR are not stacks; they keep the per-PR behaviour above, so a PR
whose base is not main and not part of a plain stack waits for its prerequisite.

All PRs of a stack have one author, so one QA owner covers it, and are linked to
the same issue: the bot builds a stack from the PRs linked to an issue. A stack
which the issue cannot see completely (a PR stacked on its tip is linked to
another issue) or whose tip is Low severity (a Low PR gets no QA, so it cannot
cover the PRs below) is not handed to QA; the bot says why on the issue. PRs by
different authors are not a stack and are judged one by one. Build a stack by
creating each branch from the one below it. Keep it in sync by merging the
parent branch into the child, bottom to top, whenever a lower PR changes.
Never rebase or squash a stacked branch: that rewrites the commits QA
tested.

- **Sync.** Every PR must contain the head of the PR below it. Otherwise the
  `Delivery stages` status fails with "Stack out of sync" and names the merge to
  make, and no review is spent on it.
- **Code review.** Every PR is reviewed against its own base, so each review sees
  only its slice. The Copilot size limit applies per slice.
- **Carrying a review over.** Merging the parent into a stacked PR changes its
  head but not its own change. The bot fingerprints the PR's diff against its
  base: per file the path, mode and rename lines and every hunk line (added,
  removed and context) exactly as written. Line numbers, the function name after
  `@@` and the blob ids of text files are left out, because merging the parent
  moves those. When the fingerprint equals that of an earlier bot-authored pass,
  and the new head contains the reviewed commit, the bot records a "carried
  over" pass for the new commit instead of reviewing again. The earlier pass is
  trusted only back to the first requirements record made under the same
  approval. Any edit to the PR's own change, moving a line, a changed context
  line (for instance when the parent edited the lines around the PR's hunk), a
  whitespace or mode change, or a pass on a commit that is not in the new head's
  history is reviewed normally. A manual Copilot waiver is never carried over.
- **QA handoff.** When every PR in the stack has passed requirements and review,
  each PR gets a handoff record and the issue moves to Ready for Testing. Only the
  tip asks the QA owner for a review, and its handoff lists the stack. The tip
  contains every lower PR, so testing it tests the whole change.
- **QA approval.** Approve the tip commit after the handoff. A lower PR takes that
  approval as its own while its head is contained in the tip commit and every link
  above it is in sync. It still needs its own requirements, review and handoff
  records, and QA must come after all of them. A new commit anywhere in the stack
  that the tip does not contain, or on the tip itself, needs a new approval.
- **Severity and technical review** are judged per PR as before.
- **Linking and merging.** After creating the PRs, link them into a stack on
  GitHub with `gh stack link <PR numbers, bottom to top>`; it works from the PRs on
  GitHub and needs no local tracking. The workflow detects a stack from branch
  names and does not need the link: the link enables GitHub's atomic stack merge.
  Merge with the stack merge button on any PR of the stack, or
  `gh stack merge <stack-number> --merge`. The merge is atomic (all PRs merge or
  none) and runs under the merger's own login, so branch protection (CI and
  `Delivery stages`) applies and cannot be bypassed, and deploy and release run as
  for any merge. Always choose the merge-commit method: squash and rebase rewrite
  the commits that were reviewed and tested. Never use `gh stack sync`, `rebase`,
  `push` or `submit` on a stack: they can rebase the branches, force-push them
  (with lease) and rewrite the PR bases, which voids the reviews and the QA. GitHub refuses the ordinary merge endpoint for a PR
  that belongs to a linked stack, so such a stack is merged as a stack. A stack
  which is not linked can be merged by hand, bottom to top: merge the bottom PR
  with a merge commit, retarget the next PR to `main`, wait until its
  `Delivery stages` is green again, and repeat. While the rest of a stack still
  targets the branch of a PR that merged on its own, its checks keep their result,
  provided the stack still contains the merged PR's head (a reused branch name is
  not enough).

## Feature integration branches

A feature built as separate frontend and backend slices has a parent issue that
owns the end-to-end scope and links its branch `integration/<parent>-<slug>`
(GitHub's linked branch in this repository, from the issue's Development section). The `integration/`
prefix is reserved for these branches. The parent issue has native sub-issues
labeled `area:frontend` and `area:backend`.

To start a feature:

1. On the parent issue, add a frontend and a backend sub-issue with their
   `area:` labels.
2. In the parent issue's Development section, create the branch
   `integration/<parent>-<slug>` from `main`.
3. Before starting a child, verify its live `area:frontend` or `area:backend`
   label and its parent’s linked integration branch. Fetch `main` and the
   integration branch. If the child needs changes from `main` that the integration
   branch lacks, reuse an open PR that brings in the needed commits or branch
   from the integration branch, merge `origin/main` into that sync branch, and
   open a PR into the integration branch with `Refs #<parent>`. Use a merge
   commit after the required checks pass to preserve ancestry. Delivery stages
   currently refuses sync PRs whose diff includes review or merge enforcement
   files. Surface that blocker if it applies.
4. Fetch the integration branch again after any required sync. Branch each child
   from the fetched integration branch and open its
   PR into it with `Closes #<sub-issue>`. Merge after Delivery stages and
   `child-verify` pass.
5. Integrate and refine through integration PRs (`Refs #<parent>`).
6. Open the parent PR from the integration branch into `main` with
   `Closes #<parent>` and the feature's severity label; it waits until the
   integration work is finished.

The `Protect integration branches` ruleset keeps these branches PR-only, with
`child-verify` and `Delivery stages` required and no force push, deletion or
rebase merge. Until it is installed, Delivery stages refuses every PR into an
integration branch. It has no bypass, so integration branches stay after the
parent PR merges; deleting one needs an administrator to edit the ruleset
first. Adding a bypass actor or rebase merges to it voids the guarantee the
parent review carry-over relies on.

PRs into an integration branch link exactly one open issue, with `Closes #N` or
`Refs #N`. GitHub closes issues only for merges into `main`, so the Integration
merge workflow closes a merged child's sub-issue as completed, but only when the
child PR says `Closes #<sub-issue>` and its merged head passed agent review for
that sub-issue. A child that only `Refs` its sub-issue is partial work and closes
nothing; neither does integration work. The workflow runs once per merge: if it
fails, re-run it or close the sub-issue by hand.

- **Child PR:** links the sub-issue. It needs exactly one `area:` label, and its
  parent issue must be open and link the PR's base branch.
- **Integration PR:** `Refs #<parent>`, for integrating both sides and refining
  the UI. The parent issue may itself be a sub-issue of an epic.

For these PRs Delivery stages requires a non-draft PR and a passing agent review
(or manual Copilot waiver) on the current commit, made after the PR's latest
retarget. It does not require requirements
approval, technical review, QA or any other human review: those gates apply to the
parent PR, which contains the whole feature. The severity label still has to be
valid. Changes to review and merge enforcement paths are refused; they go
through their own PR into `main`. These PRs are not stacks: a PR into an integration branch is never a
slice on top of the parent PR. Its head must be its own: commit statuses belong
to the commit, so the PR is refused while another open PR has the same head
commit or branch.

The `child-verify` status is published only on PRs into an integration branch. It
passes when the latest CI run made for this PR into its current base (the latest
attempt of each job) passed the lanes for the PR's role:
`checks` and `stories` for frontend, `checks` and `database` for backend, and
`checks`, `database` and `stories` for integration PRs. E2E does not run on these
PRs. Any other link fails it. CI does not re-run on a retarget, so a run from
before the PR's latest base change never counts: push a commit, or close and
reopen the PR. PRs from forks are not supported, because GitHub does not
associate their CI runs with the PR.

The agent-review runner reviews these PRs like any other, but records no
requirements step, posts no QA handoff and requests no QA. A review from before
the PR's latest retarget was made against another base and is repeated. A sub-issue moves to
Ready for Code Review once its child PR is ready for review and stays there until
the merge closes it. Integration PRs never move the parent issue's card. A
sub-issue is delivered through its child PR: a PR into `main` linked to a
sub-issue that has a child PR is not reviewed or handed to QA; link it to the
parent issue instead.

The parent PR goes from the integration branch to `main` and runs the normal
gates for its severity, with full `verify` and QA. It is blocked until the parent
issue has a frontend and a backend sub-issue (each with only its own `area:`
label) closed as completed, every sub-issue is closed and no PR into the
integration branch is still open. Until then the parent issue stays In Progress
and its PR is neither reviewed nor handed to QA. Sub-issue and label changes
reach the parent PR's status through the five-minute
reconciliation.

A parent PR is a PR from an integration branch of this repository; a fork's
branch with the same name is an ordinary PR. A PR from an integration branch
into any other branch is refused, so the branch reaches `main` only as the parent
PR. Eligibility is checked again before the QA handoff.

Once eligible, the parent PR's agent review carries over when the integration
branch, followed from the PR head down to the history it shares with `main`,
consists only of GitHub's merge or squash commits of PRs merged into the branch,
each merging a final head that passed agent review, after its latest retarget,
under the parent issue or one of its sub-issues. A single-commit rebase merge looks
like a squash and counts as one. Otherwise the whole PR is reviewed: after a
direct push, a rewritten branch, a rebase merge of several commits, a merged PR
with only a manual Copilot waiver, or more than 250 merges. The carry-over
requires the `integration/**` ruleset (PR-only, no force push or deletion, and
the `child-verify` and `Delivery stages` checks) to be active on the branch;
without it the whole PR is reviewed. The carry-over assumes that separately
reviewed frontend and backend changes do not break each other: integration problems surface only in `verify`
(including E2E) and QA of the parent PR. QA of the parent commit is still
required.

## Manual Copilot waiver

Only David (`darebakdavca`) can waive Copilot review, on any PR, by posting a
standalone comment on that PR:

```text
/copilot-waive <full-current-40-character-sha> <reason>
```

Replace the placeholders with the PR's current full SHA and a non-empty reason
on the same line. The automation reads the actual GitHub comment author and PR
container. Commands from other users or bots, quoted commands, issue text and
short or stale SHAs do not grant a waiver. This is separate from requirements
approval and does not grant QA approval.

The agent-review workflow rechecks the live command before handing the commit
to QA. Every linked PR still needs either a valid Copilot pass or its own current
waiver. The bot records the manual waiver, its reason and command link in the
QA handoff and issue summary, and requests the normal QA owner. It never writes
a fake Copilot pass or deletes earlier findings. CI and branch protection remain
unchanged; QA must approve the exact commit after the waiver and matching handoff.

A new commit requires another full-SHA command or a successful Copilot review.
Before using a waiver, the bot records the latest processed command identity for
that PR and SHA. Deleting or invalidating it cannot revive an older command; a
new explicit command is required. Commands deleted before the automation ever
observed them cannot be reconstructed from the comments API.
Editing the command changes its identity and requires a fresh matching handoff
and later QA. Deleting it (or editing it into an invalid command) revokes it:
the old bot handoff cannot act as authorization, and normal Copilot review applies
again. If the cached verdict has findings, the issue returns to Code Review.
Repeating workflow runs does not duplicate unchanged handoffs or pending review
requests. Dry runs make no writes. Native comment creation, edits and deletions
trigger reconciliation; scheduled polling remains the fallback.

## ADR acceptance

The tech lead (`rmnskb`) or the PM (`darebakdavca`) accepts architecture decision records in
[`docs/adr/`](adr/README.md) with a PR review of type Comment whose body is
`/adr-accept NNNN` (several numbers are allowed). Delivery stages checks every
file a PR adds or changes under `docs/adr/` other than the README and template,
for any severity, except on PRs into an integration branch, whose ADRs are
checked on the parent PR. In a stack, the review goes on the PR that contains the
ADR. Each file must be a regular file named `docs/adr/NNNN-short-title.md`, use a
number no other record on the PR head or the base branch uses, have the status
`Accepted`, `Superseded` or `Deprecated`, and have the same blob at the commit
of an `/adr-accept` review for its number as at the PR head. Anything else
blocks the PR, including a change after the review. Removing an ADR file is not
gated. A Comment review is not an approval: it grants no requirements, technical
or QA approval.

The check compares the PR head, not the merge result. Because required checks
are not strict, two PRs that each change the same ADR with accepted text could
both merge cleanly; acceptors should not accept parallel edits of one ADR.

## Reviewer requests and merge rules

Matej is not automatically requested at PR creation. For a non-draft PR,
technical review is requested from `rmnskb` only after CI and the agent review
have passed on the current commit, so it never happens alongside them.
Approval from `rmnskb` or `darebakdavca` is still required on the current commit
before QA handoff; David is never requested automatically, and on PRs `rmnskb`
authored nobody is, because David approves after a manual request. CODEOWNERS lists David
for workflow/enforcement paths; GitHub does not request an author to review their own PR. The bot's
Ready for Testing comment identifies the QA owner, then the bot sends that person
a GitHub review request: MatejKrones, or darebakdavca on Matej-authored PRs.
Repeated runs preserve an existing request and do not request already-valid QA
approval again. A request API failure fails the Actions run and is retried on the
next run, even when the handoff comment and board transition already exist.
New commits require a new successful review and QA handoff before another request.
A pending request can remain visible while new code is being reviewed; it is not
QA evidence. Manually added reviewers are preserved. Dry runs send no requests.

Disable the native `require_code_owner_review` requirement: otherwise a sole
code owner authoring a PR can be blocked by a redundant owner-approval gate.
The named reviewer requirements remain enforced by Delivery stages. GitHub uses zero blanket required approvals and disables last-push/extra
unattributed-change approval, so Low can merge without reviews (except the
`/adr-accept` review of a changed ADR). Delivery stages
enforces the designated current-commit QA approval for Standard/High. GitHub still
dismisses stale reviews on pushes, requires resolved review threads and enforces `verify`
and `Delivery stages` checks from GitHub Actions (app ID 15368). No standing
bypass actors are configured. Do not disable stale-review dismissal: QA must
still approve the current commit.

Workflows run trusted code from main on relevant PR/review events, human issue
comments and issue edits, with five-minute polling as a fallback. Bot comments
are ignored as direct event triggers to avoid self-triggering loops. The stage
checker publishes a `Delivery stages` commit status on the PR head, linked to
the enforcing Actions run. It starts pending and reports failure or error when
scope, agent or QA evidence is missing or cannot be read. Commit statuses avoid
creating synthetic jobs in an unrelated Actions check suite. Existing synthetic check runs
with the same name receive the same evaluated verdict (or failure on API errors);
Actions job checks and checks from other apps are never modified; the required
name and GitHub Actions source remain unchanged.
The native Actions job is always named `Reconcile delivery stages`; only the
commit status is named `Delivery stages`. Waiting for requirements, review or
QA blocks that status without failing the reconciliation job. API failures
remain workflow errors. A green reconciliation run is not a delivery pass.

PR events process their linked issues; issue events process that issue and its
linked PRs. Scheduled and manual runs reconcile all active work (manual issue
filters still apply). Agent review reconciles delivery in a final step, even
when review fails, using the same event scope; dry runs never publish verdicts.
A retarget during evaluation invalidates its result. See
[Stacked PRs](#stacked-prs) for how stacks are judged.

Advancing `main` does not require updating PR branches or invalidate existing
review/QA evidence. Changing the PR head still requires fresh code review and
post-handoff QA; unchanged requirements approval persists.

When installing this change, existing native `Delivery stages` jobs on open PRs
can still block alongside the status. Re-run affected historical enforcement
runs after installation and verify actual mergeability; do not rewrite native
job results or weaken protection. New workflow runs use the distinct job name.

## Dependency updates

Dependabot is configured in [`.github/dependabot.yml`](../.github/dependabot.yml)
for the pnpm workspace. It uses the `npm` ecosystem on the repository root, so it
covers the root `package.json`, `pnpm-workspace.yaml`, the shared `pnpm-lock.yaml`
and every package under `apps/*`.

- **Frequency:** weekly, on Monday at 06:00 (Europe/Prague), with at most five
  open version-update PRs.
- **Groups:** minor and patch updates are combined into one `minor-and-patch` PR.
  Major updates get their own PR so breaking changes are reviewed separately.
- **Security updates:** Dependabot opens these as soon as an advisory applies,
  independent of the schedule. Grouping applies to version updates only, so
  security PRs are not combined. They require Dependabot alerts and
  security updates to be enabled in the repository settings.
- **Labels:** every Dependabot PR gets `dependencies` and `severity:standard`, so
  it carries exactly one severity label. Raise the label to `severity:high` by hand when an
  update touches authentication, permissions, migrations or deployment.
- **No issue link, no review, no QA:** a PR by `dependabot[bot]` from a branch of
  this repository with `dependencies` and exactly `severity:standard` needs no
  `Closes #N` or `Refs #N`, no agent review, no human approval and no QA. The
  automation sends no requests for code review, technical approval, scope
  approval or QA. `Delivery stages` passes for it (a draft does not, and neither
  does a PR with a commit not authored by Dependabot, which follows the normal
  gates) and CI
  (`verify`) is the only gate. The exception does not apply to any other author,
  to a PR without `dependencies`, or to Low and High PRs; those follow their
  normal gates.
- **Merging:** the `Dependency update merge` workflow enables GitHub auto-merge
  (merge commit) on such a PR, so it merges as soon as every required check has
  passed on the current head and GitHub allows it. A new commit must pass the
  checks again. Auto-merge is switched off again when the PR stops being a
  standard Dependabot update (label change, draft) or when any commit on the
  branch is not authored by Dependabot, because nobody reviews these PRs. It
  needs the repository setting _Allow auto-merge_ and uses
  `PROJECT_AUTOMATION_TOKEN`: a merge made with `GITHUB_TOKEN` would not start
  the CI, deploy and release workflows on `main`.

## Releases and the stage

https://team-4.vsepractical.applifting.dev is the stage; there is no separate
production. Every push to `main` deploys it (`deploy.yml`) once CI has passed on
that commit, building exactly the commit CI verified. Also once CI passes,
`release.yml` publishes a GitHub Release. The release bumps the
patch of the highest `vX.Y.Z` tag, lists the issues the merged PR closes and links the Build & Deploy
workflow. To put any released version on the stage, run that workflow with
**Use workflow from → Tags → vX.Y.Z**. The `deploy.yml` on `main` and on new
tags deploys a manual run only from `main` or a `v*` tag whose commit is already
on `main` and has a passing `verify`, and stops before building anything
otherwise. A run from `main` therefore waits until CI has passed on its tip; pick
a tag to deploy earlier. A manual run uses the workflow file of the ref it starts
from, and the deploy secrets are repository-wide, so this guard prevents mistakes
but does not stop a branch with an edited `deploy.yml`.

The `integration/` branch prefix is reserved for feature integration branches.
PRs into an `integration/` branch skip the E2E lane, so their `verify` fails by
design; a PR to `main` runs every lane. To bump minor or major, publish the
higher tag by hand; the next merge continues from it.

Redeploying an older version does not roll back database migrations.

## Installing severity approvals

Merge the workflow changes through the existing gates first. Both workflows load
trusted code from `main`; a feature branch cannot install the new gate itself.
Then run:

```sh
node scripts/delivery/install-severity.mjs
node scripts/delivery/install-severity.mjs --apply
```

The first command is read-only. Both verify that the trusted scripts and workflows
match `main`. Apply creates the severity labels and `technical-review`, and updates `Protect main`,
preserving required CI/delivery checks, stale-review dismissal, conversation
resolution, PR-only merges and other rules. It removes only the blanket approval
count, last-push approval and extra approval for unattributed changes. There is no
standing bypass. Reconcile all open PRs using the Delivery stage enforcement
workflow; validate Low with no issue/reviews, Standard without scope approval,
and High blocked until David/Bogdan approves. New policy markers prevent old
requirements-exemption handoffs from being reused. A severity change during review
invalidates the in-flight result. Returning to a previous severity may reuse valid
evidence for the same head and unchanged policy/scope.

## Installing the feature integration flow

Merge the feature integration code through the existing gates first; the
installer refuses to run until the trusted scripts and workflows on `main` match
the local checkout. Then run:

```sh
node scripts/delivery/install-feature-flow.mjs
node scripts/delivery/install-feature-flow.mjs --apply
```

The first command is read-only and shows the labels and ruleset it would create.
Apply creates the `area:frontend` and `area:backend` labels and creates or updates
the `Protect integration branches` ruleset for `refs/heads/integration/**`, then
reads it back to verify it. It does not change `Protect main`. It needs `gh` 2.48
or newer. The ruleset lets new branches be created (status checks are not
enforced on creation); confirm this when creating the first integration branch
from a parent issue's Development section. Until the ruleset
is installed, parent PRs are reviewed as a whole instead of carrying reviews over.

## Configuration and validation

`PROJECT_AUTOMATION_TOKEN` is needed for the board; `COPILOT_GITHUB_TOKEN` is needed
for agent review. The stage checker reads issue scope evidence with its normal
GITHUB_TOKEN. Neither workflow executes PR code with its write token. API,
coverage and model failures must not produce a pass.

Run `pnpm agent-review:test` for automated gate and runner tests. A change to the
workflow itself still requires installation and live validation before claiming
end-to-end proof. Administrators can edit repository rules deliberately; there
is no standing merge bypass for them.

## Progress updates and evidence reuse

Checking or unchecking task boxes does not change the requirements text. The
contents of the `Evidence dokončení` section (a level-one or level-two heading)
are completion tracking, excluded from the requirements hash. Requirements,
checklist text, supporting links elsewhere and all other sections remain scope.
Put completion links and test reports in that evidence section; do not put new
requirements there.

Progress-only edits preserve the same scope approval, cached agent verdict and
QA handoff. Repeated polling or duplicate events therefore do not call the model,
post another handoff or request already-valid QA again. New code commits require
fresh review and QA. A changed requirement or `/requirements-rereview` invalidates
scope approval and requires fresh review against the approved scope. A forced
agent rerun can change the verdict and requires QA after that latest review.

Existing approvals made with the old full-body hash may need one fresh approval
when this policy is installed. Never reinterpret an old hash as approval of a
new scope: the originally approved body is not stored.

CI applies migrations to a clean PostgreSQL 17 database and runs the database
constraint suite. A missing or failing suite blocks CI; ordinary unit tests do
not substitute for database validation. The existing commit-specific manual
Copilot waiver can resolve a false positive with a recorded reason, but never
waives scope approval, QA, CI or GitHub branch protections.
