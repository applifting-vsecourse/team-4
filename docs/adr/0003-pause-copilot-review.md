# ADR-0003: Pause Copilot review during outages

- **Status:** Superseded by ADR-0004
- **Proposed:** 2026-11-16
- **Deciders:** Tech lead or PM
- **Related:** #421, #419

## Context

Copilot CLI uses the token owner's credits. When credits are exhausted, each
unreviewed commit needs its own manual waiver, even during a repository-wide
outage.

## Decision

Repository admins can pause Copilot review for PRs delivering to `main`,
including stacks, by setting the Actions secret `PAUSE_COPILOT_REVIEW` to
`true`. The two workflows still run from trusted `main`. CI and Delivery stages
remain required, and applicable human approvals still govern delivery. A QA
handoff issued during the pause is recorded separately from a reviewed handoff.
Integration-only PRs still follow their existing review policy.

## Alternatives considered

- **Per-commit waiver only:** Keeps an explicit decision for each head but
  requires repeated commands during an outage. Keep it for isolated exceptions
  and for rolling out the switch.
- **Remove a required GitHub check:** Would remove CI or the entire delivery
  policy rather than only Copilot review.

## Consequences

During a pause, a PR can reach QA without Copilot having reviewed the commit.
When credits return, remove the secret and run reconciliation so open PRs
that used the pause return to the normal review path. Existing Copilot results
are preserved. See the [operator procedure](../delivery-workflow.md#pause-copilot-review-for-main).
