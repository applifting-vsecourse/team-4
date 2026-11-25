# Review, testing and merge

Work reaches `main` as one pull request per issue. GitHub enforces the rules
natively (a ruleset, `CODEOWNERS` and a merge queue); there is no custom merge
check. The delivery model is in
[ADR-0005](adr/0005-native-github-delivery.md) and proposed [ADR-0007](adr/0007-codeowners-guide-review-routing.md);
role-based ownership is proposed in
[ADR-0006](adr/0006-role-based-code-ownership.md).

## The path of a change

1. Branch from the latest `main`, implement the issue and run the checks that
   fit the change (see [Local checks](#local-checks)).
2. Open a PR into `main` from the [template](../.github/pull_request_template.md)
   with `Closes #N` (or `Refs #N` for partial work). A draft is fine while
   work continues.
3. CI runs on every push. Comment `/review` for an optional
   [Copilot review](#copilot-review).
4. When CI passes on the current commit of a ready PR, the
   [QA notifier](#qa) asks the tester for a review and moves the issue to
   Ready for Testing.
5. Once the PR has its approvals, click **Merge when ready**: the merge queue
   runs CI with the whole E2E suite on the merge result and merges it. The
   issue moves to Done.

Stacked PRs and feature integration branches are no longer used: an issue is
delivered by one PR. Split an issue that is too big into smaller issues.

## What a merge needs

| Rule                   | Detail                                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| CI (`verify`)          | Passes on the PR's current commit, and again in the merge queue on the merge result.                                       |
| One approval           | From someone other than the PR's author and its last pusher, on the latest push. A new commit dismisses earlier approvals. |
| Resolved conversations | Every review thread is resolved.                                                                                           |
| Merge queue            | Merges go through the queue with a merge commit; direct pushes, force pushes and deleting `main` are blocked.              |

A rejected or dismissed review never counts. There is no bypass, including for
administrators.

## Code owners

[`CODEOWNERS`](../.github/CODEOWNERS) routes domain work to the team members
responsible for it: `rmnskb` for backend and database work, `JakubHerr` for
frontend work, and `MatejKrones` for QA and email work. Shared delivery,
repository rules, dependencies, infrastructure and ADRs are co-owned by
`MatejKrones` and `rmnskb`. Frontend E2E files are co-owned by `JakubHerr`
and `MatejKrones`; backend email files by `MatejKrones` and `rmnskb`.

This map documents responsibility and helps choose the default QA reviewer; it
does not restrict who can approve or add a merge gate. The first listed eligible
owner is the preferred reviewer when Matej authors a PR. The PM is not a code
owner.

## QA

QA approves the PR's current commit after testing it as described in
[Local QA](local-qa.md). Any teammate other than the PR's author may approve;
the approval counts whenever it is given for the current commit, including
before the notifier asks.

The QA notifier ([`qa-notify.yml`](../.github/workflows/qa-notify.yml)) never
blocks anything. When CI passes on the current commit of an open, non-draft PR
into `main`, or such a PR is marked ready, it requests one teammate to test and
moves the issues the PR links to Ready for Testing. Matej is the default
tester for PRs from other teammates. For Matej's own PRs, it asks the primary
code owner of the area with the most changed files, skipping Matej; ties prefer
an eligible owner shared by the changed areas, then rotate by PR number among
the tied owners. Any teammate's approval of the current commit counts as QA,
including an approval before the request goes out. One approval from a teammate
other than the PR author and last pusher satisfies both QA and the review gate;
the reviewer does not need to own the changed paths. The notifier asks nobody
when a teammate already approved this commit, when the assigned tester already
reviewed it, or for documentation-only and Dependabot PRs. Failed CI moves an
issue in Ready for Testing back to In Progress. A merge moves the issues the PR
closes (`Closes #N`) to Done; an issue it only refers to (`Refs #N`) stays where
it is. Issues a person moved past testing stay where they are.

## Copilot review

A comment that starts with `/review` alone on its first line, by anyone with
access to the repository, runs one Copilot review of the PR's current commit
([`review.yml`](../.github/workflows/review.yml)). It reads the diff, the PR
description, the linked issue and the review rules from `CLAUDE.md` and
`DESIGN.md` on `main`, and posts its findings as a comment: possible breakages
first, then notes. The review is advisory. It informs the human reviewer and
never blocks a merge; ask again after new commits if you want another one.
Copilot CLI runs without tool permissions, with the trusted checkout of `main`
and only its own token; the PR's code is never checked out or run.

## Local checks

Run what fits the change before you push, for example:

- `pnpm check` for frontend work, `pnpm backend test` for backend work,
  `pnpm backend test:db` for repositories and migrations, and
  `pnpm frontend test:stories <file>` for the stories you touched;
- `pnpm e2e:affected` for the E2E specs the change affects
  (`--list` shows the selection, `--all` runs everything,
  arguments after `--` go to Playwright).

`pnpm check-all` and `pnpm check-stories` remain available but are not required
before a commit, push or PR: CI runs every lane on every PR.

E2E specs run in parallel (four workers locally, override with
`E2E_WORKERS`). Run `pnpm backend test:db` after, not before, an E2E run: it
shares the local database and leaves evaluations queued that slow the next
E2E run down until they are processed
([#396](https://github.com/applifting-vsecourse/team-4/issues/396) separates
the databases).

## E2E selection in CI

On a PR, CI runs only the E2E specs the change affects
([`scripts/e2e/select.mjs`](../scripts/e2e/select.mjs)); the job summary lists
them and why. Every changed path is classified:

- documentation, stories, unit and database tests, fixtures and other
  workflows need no E2E;
- a changed spec runs itself;
- a product area (accommodation, events, landing, participant, payments,
  programme, registrations) runs the specs that exercise it, whether the change
  is in a frontend feature, a route or a backend module;
- shared frontend or backend code, authentication, the database schema and
  migrations, dependencies, build configuration, CI and the E2E infrastructure
  run the whole suite;
- a path no rule knows runs the whole suite, so an unknown impact is never
  skipped.

A new spec must list its areas in `SPEC_AREAS`; a unit test fails otherwise.
The merge queue, every push to `main` and a manual run of the CI workflow always
run the whole suite, split into four parallel shards.

## Dependency updates

Dependabot ([`.github/dependabot.yml`](../.github/dependabot.yml)) opens one
grouped `minor-and-patch` PR a week (Monday 06:00 Europe/Prague), separate PRs
for major updates (`vitest-major`, `nestjs-major`; TypeScript majors are
ignored) and security updates as soon as an advisory applies. Every Dependabot
PR gets the `dependencies` label and GitHub auto-merge
([`dependency-merge.yml`](../.github/workflows/dependency-merge.yml)): it merges
through the queue as soon as CI passes; the workflow approves it itself, so no
teammate is involved.

## Releases and the stage

https://team-4.vsepractical.applifting.dev is the stage; there is no separate
production. Every push to `main` deploys it (`deploy.yml`) once CI has passed on
that commit, building exactly the commit CI verified. Also once CI passes,
`release.yml` publishes a GitHub Release. The release bumps the patch of the
highest `vX.Y.Z` tag, lists the issues the merged PR closes and links the Build
& Deploy workflow. To put any released version on the stage, run that workflow
with **Use workflow from → Tags → vX.Y.Z**. A manual run deploys only `main` or
a `v*` tag whose commit is already on `main` and has a passing `verify`, and
stops before building anything otherwise. A manual run uses the workflow file of
the ref it starts from, and the deploy secrets are repository-wide, so this
guard prevents mistakes but does not stop a branch with an edited `deploy.yml`.

The merge queue may merge several PRs together; the release of that merge is
named after the last of them, and its notes list everything since the previous
tag. To bump minor or major, publish the higher tag by hand; the next merge
continues from it. Redeploying an older version does not roll back database
migrations.

## Installing the rules

The rules live in [`scripts/rules/rules.mjs`](../scripts/rules/rules.mjs). After
a change to them is merged, a repository administrator runs from an up-to-date
`main`:

```sh
node scripts/rules/install.mjs          # shows what would change
node scripts/rules/install.mjs --apply  # applies it and reads it back
```

The installer refuses to run unless its code matches `origin/main` and
`CODEOWNERS` on `main` gives every protected path its configured owners. It
updates `Protect main` (one approval of the latest push, resolved conversations,
the required `verify` check from GitHub Actions and the merge queue), deletes the
retired `Protect integration branches` ruleset and fails unless GitHub stored
exactly the proposed rules. It does not delete labels or branches.

Run it right after the change that introduced these rules is merged: until then
`Protect main` still requires the retired `Delivery stages` check, which nothing
reports any more.
