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
4. The tech lead (`rmnskb`) accepts it with a standalone PR comment
   `ADR-NNNN accepted`. A PR review is not used for this, because on High PRs his
   approving review also counts as requirements approval. The author then sets
   the status to `Accepted YYYY-MM-DD in #PR`, here and in the index. If the PR's
   severity requires code review and QA, request them after this commit, so they
   check the final text.
5. If the decision is rejected, close the PR without merging. An ADR on `main`
   is always `Accepted`, `Superseded` or `Deprecated`.

## Numbering and status

- Numbers are four digits, sequential and never reused. If two open PRs take the
  same number, the one that merges second renumbers.
- `Proposed`: under discussion in a PR, not yet on `main`.
- `Accepted`: in force. Follow it, or propose a new ADR to change it.
- `Superseded by ADR-NNNN`: replaced by a newer decision.
- `Deprecated`: no longer applies and has no replacement.

An accepted ADR is not rewritten. To change a decision, write a new ADR that
references the old one and, in the same PR, change only the old ADR's status
line and its index row. Fixing typos and broken links is fine.

## Links

Each ADR lists the issues and PRs it came from in its `Related` field. A PR that
applies or changes an accepted decision mentions the ADR in its description.

## Index

| ADR                                          | Title                                          | Status   |
| -------------------------------------------- | ---------------------------------------------- | -------- |
| [0001](0001-feature-integration-branches.md) | Integrate FE/BE slices on integration branches | Accepted |
