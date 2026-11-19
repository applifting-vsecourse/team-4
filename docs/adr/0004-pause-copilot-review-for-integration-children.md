# ADR-0004: Pause Copilot review for integration child PRs

- **Status:** Proposed
- **Proposed:** 2026-11-19
- **Deciders:** Tech lead or PM
- **Related:** #453, #421, ADR-0003

## Context

ADR-0003 limits `PAUSE_COPILOT_REVIEW` to PRs delivering to `main`. Frontend
and backend child PRs into protected integration branches still require a
current-commit agent review. When Copilot is unavailable, this blocks child
merges even though the feature's parent PR still receives its own review and
QA before reaching `main`.

## Decision

We extend `PAUSE_COPILOT_REVIEW=true` to child PRs that link a frontend or
backend sub-issue and target its parent's protected integration branch. The
review runner records a skip, never a passing review. CI lanes, issue and parent
linkage, branch protection, delivery checks, and the parent's review and QA
requirements remain in force. Integration PRs linked to the parent issue still
require review evidence or a manual waiver.

A child merged without review evidence does not count toward parent review
carry-over. Once Copilot review resumes, the parent PR must receive its own
current-commit review unless all merged children have valid review evidence.

## Alternatives considered

- **Keep the pause limited to `main`:** Preserves the original policy but leaves
  child delivery blocked during a repository-wide Copilot outage.
- **Waive review for every integration PR:** Also removes review from the
  integration work that combines the child changes, so this remains out of
  scope.

## Consequences

Child work can merge during a Copilot outage while the protected CI and delivery
gates remain active. A paused child does not provide review evidence for parent
carry-over, so the complete parent change must be reviewed after the pause is
removed. The issue-closing workflow records when it closes a child under the
pause.
