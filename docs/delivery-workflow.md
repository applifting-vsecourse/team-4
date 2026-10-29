# Review, testing and merge

Requirements approval accepts the issue's product direction and scope. It is not
an approval of every subsequent code edit. Code review and QA independently
check the implementation being merged.

## Severity and required gates

Select one PR label: `severity:low`, `severity:standard` or `severity:high`.
No severity label means Standard. Multiple or unknown `severity:` labels block
merging. Classify by risk and use the highest level in mixed changes. The author
sets the label; collaborators may escalate it. The gate reads live labels and
re-evaluates on label changes, pushes, reviews and scheduled reconciliation.

| Gate                                     | Low      | Standard (default) | High                               |
| ---------------------------------------- | -------- | ------------------ | ---------------------------------- |
| CI (`verify`)                            | Required | Required           | Required                           |
| Issue link (`Closes #N` or `Refs #N`)    | Optional | Required           | Required                           |
| Requirements approval                    | Skipped  | Skipped            | David or Bogdan before code review |
| Independent Copilot code review          | Skipped  | Required           | Required                           |
| Human QA of current commit after handoff | Skipped  | Required           | Required                           |

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

## Requirements (High only)

Open a PR targeting main and link each issue with `Closes #N` if the PR completes
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

## Reviewer requests and merge rules

Matej is not automatically requested at PR creation. CODEOWNERS lists David
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
unattributed-change approval, so Low can merge without reviews. Delivery stages
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
Stacked PRs wait for their prerequisite and retargeting to `main`; they do not
fail unrelated reviews or receive QA handoffs. A retarget during evaluation
invalidates its result.

Advancing `main` does not require updating PR branches or invalidate existing
review/QA evidence. Changing the PR head still requires fresh code review and
post-handoff QA; unchanged requirements approval persists.

When installing this change, existing native `Delivery stages` jobs on open PRs
can still block alongside the status. Re-run affected historical enforcement
runs after installation and verify actual mergeability; do not rewrite native
job results or weaken protection. New workflow runs use the distinct job name.

## Releases and the stage

https://team-4.vsepractical.applifting.dev is the stage; there is no separate
production. Every push to `main` deploys it (`deploy.yml`); once CI passes on
that commit, `release.yml` publishes a GitHub Release. The release bumps the
patch of the highest `vX.Y.Z` tag, lists the issues the merged PR closes and links the Build & Deploy
workflow. To put any released version on the stage, run that workflow with
**Use workflow from → Tags → vX.Y.Z**. To bump minor or major, publish the
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
match `main`. Apply creates the three severity labels and updates `Protect main`,
preserving required CI/delivery checks, stale-review dismissal, conversation
resolution, PR-only merges and other rules. It removes only the blanket approval
count, last-push approval and extra approval for unattributed changes. There is no
standing bypass. Reconcile all open PRs using the Delivery stage enforcement
workflow; validate Low with no issue/reviews, Standard without scope approval,
and High blocked until David/Bogdan approves. New policy markers prevent old
requirements-exemption handoffs from being reused. A severity change during review
invalidates the in-flight result. Returning to a previous severity may reuse valid
evidence for the same head and unchanged policy/scope.

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
