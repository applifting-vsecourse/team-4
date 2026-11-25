# ADR-0006: Assign code ownership by team role

- **Status:** Proposed
- **Proposed:** 2026-11-25
- **Deciders:** tech lead (`rmnskb`); PM (`darebakdavca`) for team role boundaries
- **Related:** #499, #506, ADR-0005

## Context

ADR-0005 assigns the PM as a code owner for shared delivery and infrastructure
paths. The PM wants to keep product ownership separate from technical code
ownership, and the team has clearer owners for backend, frontend, QA and email
work.

The main ruleset requires a code owner approval on owned paths. If a path has
only one owner and that person authors a PR, no other code owner can approve
the change. The ownership map needs peer coverage as well as role-based routing.

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
`scripts/rules/rules.mjs`. GitHub treats co-owners as alternatives: one
approval from any listed owner satisfies the code-owner rule. It does not
enforce a primary-versus-backup distinction.

The PM remains responsible for product requirements and issue scope. The QA
notifier's tester assignment remains a separate role; this ADR does not change
the approval or QA behavior from ADR-0005.

## Alternatives considered

- **Keep the PM as a shared code owner:** rejected because it mixes product
  decisions with technical review responsibility.
- **Give every path one owner:** rejected because that owner could not approve
  their own PR, leaving no eligible code owner for changes they author.
- **List the whole team for every path:** rejected because it obscures who
  maintains each area and routes unrelated review requests to everyone.

## Consequences

- Review requests follow the team's implementation responsibilities, and the
  PM is not asked to provide code-owner approval.
- A co-owner can approve when the role owner authors a change; either listed
  person can satisfy GitHub's code-owner rule.
- The ruleset does not guarantee that the primary role owner approves every
  change. The team may revisit this if specialist review is needed as a hard
  gate.
