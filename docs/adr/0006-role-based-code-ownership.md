# ADR-0006: Assign code ownership by team role

- **Status:** Proposed
- **Proposed:** 2026-11-25
- **Deciders:** tech lead (`rmnskb`); PM (`darebakdavca`) for team role boundaries
- **Related:** #499, #506, ADR-0005

## Context

The earlier ownership map included the PM as a code owner for shared delivery
and infrastructure. The PM wants to keep product ownership separate from
technical code ownership, and the team has clearer owners for backend, frontend,
QA and email work.

The team wants reviewers to understand who owns each area and use that context
to choose the default QA request. Requiring an owner approval would turn that
routing hint into an additional merge restriction and can require a separate QA
and owner review.

## Decision

We assign code ownership by the team member's technical role and keep the PM
out of `CODEOWNERS`:

- `rmnskb` owns backend and database work. `MatejKrones` is the backup owner
  for those paths.
- `JakubHerr` owns frontend work. `rmnskb` is the backup owner.
- `MatejKrones` owns QA work and email code. `JakubHerr` backs up frontend
  E2E files, and `rmnskb` backs up backend email files.
- `MatejKrones` and `rmnskb` co-own shared delivery, repository rules,
  dependencies, deployment and infrastructure, delivery documentation and
  ADRs.

The precise paths are listed in `.github/CODEOWNERS`. The installer checks
that required paths keep their configured owners in
`scripts/rules/rules.mjs`. The QA notifier uses that map to choose a default
reviewer for Matej's PRs. It does not restrict who can approve a PR; the review
policy is proposed in [ADR-0007](0007-codeowners-guide-review-routing.md).

The PM remains responsible for product requirements and issue scope. Matej is
the default QA reviewer for PRs from other teammates; his own PRs are routed by
changed area.

## Alternatives considered

- **Keep the PM as a shared code owner:** rejected because it mixes product
  decisions with technical review responsibility.
- **Give every path one owner:** rejected because that person could not be the
  default QA reviewer for their own PR.
- **List the whole team for every path:** rejected because it obscures who
  maintains each area and routes unrelated review requests to everyone.

## Consequences

- Review requests follow the team's implementation responsibilities, and the
  PM is not asked to provide code-owner approval.
- A co-owner can provide the default QA review when the role owner authors a
  change.
- The ruleset does not guarantee that the primary role owner approves every
  change. The team may revisit this if specialist review is needed as a hard
  gate.
