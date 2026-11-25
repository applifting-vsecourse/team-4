# ADR-0007: Use code ownership to guide reviewer routing

- **Status:** Proposed
- **Proposed:** 2026-11-25
- **Deciders:** tech lead (`rmnskb`); PM (`darebakdavca`) for team workflow
- **Related:** #499, #506, ADR-0005, ADR-0006

## Context

The team wants one review to be enough for a PR, while still directing QA
requests toward teammates who can test the change. Requiring a code-owner
approval for owned paths can make a QA review from another teammate
insufficient, leading to separate QA and merge reviews.

## Decision

We use `CODEOWNERS` to record area responsibility and guide default QA
assignment, not to restrict who may approve a PR:

- A PR needs one approval of its latest commit from someone other than the
  author and last pusher. Any teammate may provide that approval.
- The QA notifier asks Matej to test PRs from other teammates. Matej's PRs are
  routed to an eligible owner of the area with the most changed files; a tie
  prefers an owner shared by the changed areas, then rotates by PR number.
- An eligible teammate's approval of the current commit counts as QA, whether
  it is given before or after the notifier's request.
- CI, resolved conversations and the merge queue remain required.

The ruleset sets `require_code_owner_review` to `false`. The map and routing
details are maintained in [the delivery workflow](../delivery-workflow.md),
[`CODEOWNERS`](../../.github/CODEOWNERS) and
[`scripts/notify/qa.mjs`](../../scripts/notify/qa.mjs).

## Alternatives considered

- **Require a code-owner approval for owned paths:** rejected because a
  non-owner QA review could not satisfy the merge rule, creating a second
  approval request and defeating the one-review goal.

## Consequences

- The team can merge after one eligible teammate review, regardless of the
  paths changed.
- The QA request still points to a teammate selected for the PR author and
  changed area, but specialist review is encouraged rather than enforced.
- CI and the merge queue remain the automated safeguards; a missing specialist
  review is a risk the team accepts.
