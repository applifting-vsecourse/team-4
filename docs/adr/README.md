# Architecture decision records

An architecture decision record (ADR) keeps one significant technical decision
with its context, the reasons for it and its consequences, so the team can see
why akc.io works the way it does before changing it. Records start with the
decisions made since this process was introduced; older decisions are recorded
only when they are still relevant and someone needs them written down.

GitHub issues remain the source of truth for product requirements. An ADR
records the technical choice made to deliver them and links those issues.

## When to write one

Write an ADR when a decision is hard to reverse or shapes work beyond a single
story, for example:

- the data model, persistence or consistency strategy (queues, locking,
  idempotency);
- a boundary between modules, apps or external systems, including
  authentication and permissions;
- a new shared service, framework or dependency (usually a PR that also needs
  the `technical-review` label);
- how code is built, reviewed, delivered or deployed.

Do not write one for implementation details of one feature, product
requirements (they belong in the issue), or rules already in `CLAUDE.md` or
`DESIGN.md`. If you are unsure, ask the tech lead.

## Propose, review and accept

1. Copy [`template.md`](template.md) to `NNNN-short-title.md`, using the next
   free number, fill it in with status `Proposed` and add its row to the
   [index](#index). Keep it short: a reader should understand the decision in a
   few minutes.
2. Open a PR with the ADR, either on its own before implementation or together
   with the first PR that applies it. Link the related issue in the PR as usual.
   A PR that only adds an ADR is normally `severity:low`; a change to
   `CLAUDE.md` makes it High.
3. The team discusses the ADR in the PR. Changes to the proposal are commits to
   the same file.
4. Once the discussion has settled, the author sets the status to
   `Accepted YYYY-MM-DD in #PR`, here and in the index, and pushes the final text.
5. The tech lead (`rmnskb`) or the PM (`darebakdavca`) accepts that text with a PR review of type
   **Comment** (Files changed → Review changes → Comment) whose body is
   `/adr-accept NNNN`; one review can accept several ADRs, as in
   `/adr-accept 0002 0001`. A Comment review records the commit it was made on,
   so the accepted text is exact, and it does not count as an approval or as
   requirements approval. It also works on the acceptor's own PRs.
6. If the PR's severity requires code review and QA, request them after the
   acceptance.
7. If the decision is rejected, close the PR without merging.

Delivery stages enforces this on every PR into `main` or a stack, whatever its
severity: each ADR file the PR adds or changes needs a correct name, an unused
number, a final status (`Accepted`, `Superseded` or `Deprecated`) and an
`/adr-accept` review whose commit has the same file content as the PR head. A
`Proposed` ADR cannot merge, and any later change to the file, even a typo fix,
needs a fresh `/adr-accept`. In a stack, post the review on the PR that contains
the ADR. ADRs in PRs into an integration branch are checked on the parent PR.
The rules are in the [delivery workflow](../delivery-workflow.md#adr-acceptance).

## Numbering and status

- Numbers are four digits, sequential and never reused. If two open PRs take the
  same number, the one that merges second renumbers.
- `Proposed`: under discussion in a PR, not yet on `main`.
- `Accepted`: in force. Follow it, or propose a new ADR to change it.
- `Superseded by ADR-NNNN`: replaced by a newer decision.
- `Deprecated`: no longer applies and has no replacement.

An accepted ADR is not rewritten. To change a decision, write a new ADR that
references the old one and, in the same PR, change only the old ADR's status
line and its index row; one review accepts both files. Fixing
typos and broken links is fine, with a fresh `/adr-accept`.

## Links

Each ADR lists the issues and PRs it came from in its `Related` field. A PR that
applies or changes an accepted decision mentions the ADR in its description.

## Index

| ADR                                          | Title                                          | Status   |
| -------------------------------------------- | ---------------------------------------------- | -------- |
| [0001](0001-feature-integration-branches.md) | Integrate FE/BE slices on integration branches | Proposed |
