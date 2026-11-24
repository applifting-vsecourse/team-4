# ADR-0005: Deliver through native GitHub rules

- **Status:** Proposed
- **Proposed:** 2026-11-24
- **Deciders:** tech lead (`rmnskb`); PM (`darebakdavca`) for the issue scope
- **Related:** #499, ADR-0001, ADR-0003, ADR-0004, #313, #334

## Context

By Sprint 5 our delivery process was enforced by our own automation: a
`Delivery stages` check and an agent-review workflow that ran every five
minutes, about 5,700 lines of scripts with 8,700 lines of tests. It handled
severity labels, requirements approval per issue, a blocking Copilot review
with waivers and an outage pause, integration branches with review carry-over
(ADR-0001, ADR-0004), stacked PRs and QA handoffs. Every PR waited for several
sequential steps, and the automation itself needed upkeep. Meanwhile `main`
went red twice in one day (#486, #487) because required checks did not test the
merge result. Copilot review is no longer budget-limited, so PRs no longer
need splitting into stacks.

## Decision

We let GitHub enforce delivery to `main` natively and keep only automation
that informs people:

- A ruleset (`Protect main`, installed by `scripts/rules/install.mjs`) requires
  the `verify` check from GitHub Actions, one approval of the latest push by
  someone other than its author or pusher (new commits dismiss approvals), a
  code owner's approval for owned paths, resolved conversations, and merging
  through a merge queue with merge commits. There is no bypass.
- `CODEOWNERS` gives automation, CI, dependencies, infrastructure, migrations
  and ADRs to `rmnskb` and `darebakdavca`. This replaces the `technical-review`
  label and the `/adr-accept` command: an ADR is accepted by a code owner's
  approving review of the PR.
- One issue is delivered by one PR. Feature integration branches (ADR-0001),
  stacked PRs, severity labels, requirements approval and the `Delivery stages`
  check are retired.
- QA is an approving review of the current commit by anyone except the author.
  A notifier workflow asks the tester once CI passes and moves the board; it
  never blocks a merge.
- Copilot review runs on request (`/review`), posts advisory findings and
  never blocks. The pause and waiver of ADR-0003/ADR-0004 are retired with it.
- CI selects the E2E specs a PR affects (`scripts/e2e/select.mjs`); the merge
  queue, `main` and manual runs run the whole suite in four parallel shards.
  Unknown impact runs everything.

The rules are documented in [the delivery workflow](../delivery-workflow.md).

## Alternatives considered

- **Keep `Delivery stages` and only remove what #499 lists:** less change at
  once, but the custom gate code, its scheduled runs and its tests would stay
  ours to maintain, and every gate rule would remain custom.
- **A hybrid with a small blocking check for owned paths or docs-only PRs:**
  would allow two approvals on owned paths or none for documentation, but
  reintroduces custom enforcement for little benefit; one approval suffices.
- **A blocking Copilot review:** needs the waiver and pause machinery again and
  blocks on model errors; an advisory review on request gives the same signal.
- **Strict "up to date with main" checks instead of a merge queue:** keeps
  `main` green too, but forces every PR to re-sync and re-run CI after each
  merge.

## Consequences

- Merging needs fewer steps and no custom automation can block it; GitHub
  shows exactly what is missing.
- The merge queue tests every merge result, so `main` stays green, at the cost
  of one more full CI run per merge.
- One approval serves as QA, so on owned paths the owner's approval covers both;
  we accept that and expect the owner to test what they approve.
- Documentation-only PRs still need one approval.
- A big issue must be split into smaller issues instead of stacked PRs.
- Dependabot PRs need an owner's approval before they merge.
- Revisit if review load or regressions show that two approvals, or path-based
  gates, are needed.
