# ADR-0001: Integrate FE/BE slices on integration branches

- **Status:** Accepted 2026-11-13 in #361
- **Proposed:** 2026-11-13
- **Deciders:** tech lead (`rmnskb`); PM (`darebakdavca`) for the parent review
  carry-over
- **Related:** #313, #330, #331, #332, #335

## Context

Features are often built as a frontend slice and a backend slice by different
people at the same time. Before this decision each slice went to `main` on its own
and needed the full gates there, including human QA, even though the frontend slice
works against fixtures and mocks and cannot be tested as a feature. Delivering a
whole feature in one PR is not an option either: the diff exceeds what the
Copilot agent review can handle. `main` has to stay releasable, and deployment
runs from it.

## Decision

We deliver a split feature through a protected integration branch and apply human
gates once, to the complete feature.

- **Structure.** A parent issue owns the end-to-end scope and has native
  sub-issues labeled `area:frontend` and `area:backend`. Its linked branch is
  `integration/<parent>-<slug>`. The `integration/` prefix is reserved, because
  `feature/` is already used for ordinary story branches.
- **Child PRs** target the integration branch with `Closes #<sub-issue>`. They need
  the CI lanes for their area, published as one `child-verify` status, and agent
  review of the current commit. They need no requirements approval, human review
  or QA. A merged child closes its sub-issue, not the parent.
- **Integration PRs** (`Refs #<parent>`) bring both sides together, refine the UI
  and sync `main` into the branch, under the same gates as child PRs, except that
  `child-verify` requires the lanes of both sides.
- **The parent PR** goes from the integration branch to `main` with
  `Closes #<parent>`. It becomes eligible once a frontend and a backend
  sub-issue are closed as completed, every sub-issue is closed and no PR into the
  branch is open. It then runs full `verify`, the gates for its severity and QA
  of its current commit.
- **Review carry-over.** The parent PR's agent review carries over from the
  reviewed child and integration PRs only when the branch history consists solely
  of their merge or squash commits and the ruleset below is active. Otherwise the
  whole parent PR is reviewed.
- **Protection.** The `Protect integration branches` ruleset on
  `refs/heads/integration/**` allows changes only through PRs (merge or squash),
  forbids force pushes and deletion, requires `child-verify` and `Delivery stages`,
  and has no bypass. `scripts/delivery/install-feature-flow.mjs` installs and
  verifies it. Delivery stages refuses PRs into integration branches while it is
  missing.
- **Deployment** runs only for verified commits on `main`, never from an
  integration branch.

The operational rules live in
[`docs/delivery-workflow.md`](../delivery-workflow.md#feature-integration-branches).

## Alternatives considered

- **One PR per feature into `main`:** the diff is too large for agent review, and
  the FE and BE authors would block each other.
- **Each slice straight to `main`:** QA has to test a mocked frontend or a backend
  without UI, and `main` carries half-finished features.
- **Stacked PRs:** they suit one author's sequence of slices, not two people
  working in parallel. They stay the tool for splitting one person's story.
- **Integration branches without a ruleset:** a direct or force push could put
  unreviewed code on the branch, so the review carry-over would not be safe.

## Consequences

- FE and BE work proceeds in parallel with fast, automated gates. QA tests a
  complete feature once.
- **Accepted risk:** the carry-over assumes that separately reviewed frontend and
  backend changes do not break each other. Integration defects show up only in the
  parent PR's `verify` (including E2E) and its QA.
- Integration branches are long-lived and must be kept current with `main`
  through sync PRs.
- With no bypass, integration branches remain after merge, and deleting one needs
  an administrator to edit the ruleset. Adding a bypass actor or allowing rebase
  merges would void the carry-over guarantee.
- Revisit if parent PRs regularly fail QA on integration problems, or if the
  agent review budget grows enough to review whole features.
