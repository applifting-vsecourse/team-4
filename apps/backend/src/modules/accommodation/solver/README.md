# Accommodation solver (S3-T3, S3-T4)

Evaluates one term of an event as specified in [#181](https://github.com/applifting-vsecourse/team-4/issues/181) (spec v4, §7): who of the pending and waitlisted participants can be confirmed, why the others cannot, and, in phase 2, which room everyone sleeps in.

Phase 2 (room proposals for confirmed participants, with soft preferences) is specified in [`docs/architecture/accommodation-solver-phase-2.md`](../../../../../../docs/architecture/accommodation-solver-phase-2.md) ([#325](https://github.com/applifting-vsecourse/team-4/issues/325)).

F13-1 calls it through `AccommodationEvaluationService.evaluateTerm` ([#223](https://github.com/applifting-vsecourse/team-4/issues/223)):

```ts
const run = await evaluation.evaluateTerm(eventId, termId, { triggeredById });
```

The service reads the term as it is now and stores an immutable `accommodation_run` with a snapshot of everything it decided from: the rooms with that term's beds, the rules, every participant's answer, determination and effective value, and the term order with positions. It never confirms, waitlists, creates a debt or assigns a room.

- **Term order** (`domain/term-order.ts`, §1, §6): by `receivedAt`, then by registration id; a stored manual order (`accommodation_term_order`, F39-1) wins, and anyone it does not list goes right after everyone received before them.
- **Effective value** (`domain/effective-value.ts`, §4): a determining answer, or the organizer's determination (`accommodation_manual_value`) while the answer it was made on is unchanged. Nothing is guessed: without one the participant gets reason R.
- **Rules** (`accommodation_rules`, §2): no row means no hard attribute; only capacity and order decide.
- **Answers** to the hard attribute come from `HardAttributeAnswers`. The form has no categorical questions yet, so the default provider returns none; the story that stores them (F64 or the categorical-questions story) replaces it.
- Rules, determinations, orders and interventions (`accommodation_intervention`) have no writer yet; F14-1, F39-1 and the rules settings add them. Runs and interventions are immutable (database trigger).

`solveAssignmentInWorker` runs `solveAssignment` in a worker thread, because HiGHS blocks the thread it runs on.

## What it decides

Variant M (PM decision on #181), level by level, each level keeping the optimum of the previous ones:

1. Most candidates accommodated.
2. Among those, the higher positions in the term's order, exactly: the order is walked from the top and each candidate is fixed as placed while the optimal count still allows it.
3. Base beds before extra beds.
4. Fewest rooms (phase 2).
5. Fewest soft-rule violations, weighted by rank (phase 2).

Levels 1–2 decide who is suitable and must finish within the time limit (30 s per term), otherwise the result is `timeout`. Levels 3–5 only shape the rooms: when they run out of time the best valid layout found so far is kept and `stats.complete` is `false`.

Hard constraints: the term's beds per room, one hard-attribute value per room, confirmed participants always accommodated. Candidates without an effective value under a hard attribute are not evaluated (reason `R`). Unplaced reasons `A`, `B`, `C`, `N` follow spec §7.5. Confirmed participants who no longer fit give `infeasible` with the participants involved.

## Two models

- **Phase 1** (`phase-one.ts`) uses an aggregate model. Without pinned rooms, rooms with the same beds are interchangeable, and so are candidates with the same hard-attribute value: a value with `a` places always takes its `a` highest positions. The model only decides how many rooms of each type carry each value. `phase-equivalence.spec.ts` checks on random terms that it picks the same people with the same reasons as the room-level model.
- **Phase 2** (`assignment-model.ts`) models every person in every room, as needed for room proposals, soft attributes and pinned rooms.

## Spike results

`pnpm backend solver:benchmark`: 200 participants over three overlapping terms, 40 rooms (mostly identical), gender as the hard attribute, 3 and 5 soft attributes, plus an overbooked term with all 200 participants for 134 beds.

| Case | Phase 1 (aggregate) | Phase 2 (room level) |
|---|---|---|
| 3 terms, 109–133 candidates each, 134–162 beds, 3 or 5 soft attributes | 11–91 ms, exact | same people in every term, but stopped at 30 s with the room layout not proven optimal |
| Overbooked term: 200 candidates, 134 beds | 97 ms (19 solves), exact | `timeout`: levels 1–2 do not finish in 30 s |
| Re-run with 60 confirmed participants | 12 ms | not measured |

Earlier variants that did not work:

- **One weighted objective** instead of levels: in every term it picked different and fewer people (76 instead of 120 in one term), and still ran 30 s. Weights strong enough to keep the levels apart are numerically out of reach for 200 positions.
- **Room-level model for phase 1:** 0.6–4.7 s with spare beds, but `timeout` once the term was overbooked, because every priority step became a subset-sum search over identical rooms.
- **Symmetry-breaking rows** (fill identical rooms in order) made the room-level model slower, not faster.
- **One row per person and room** for soft attributes instead of the aggregated row: the soft level took longer and overran its limit.

## Conclusions

- HiGHS in a worker thread is enough for phase 1 (Sprint 3 scope) with a wide margin; no CP-SAT service is needed for it.
- Phase 2 should not decide who is suitable again. It should take phase 1's suitable people as fixed and only lay them out in rooms (levels 3–5). The soft-attribute level does not reach a proven optimum in 30 s; it returns the best layout found. Whether that layout is good enough, or a CP-SAT service is worth it, is a phase 2 decision.
- HiGHS checks its clock only now and then, so a level can overrun the limit by a few seconds. The worker runner terminates the worker 2 s after the limit as a safety net.
- A layout HiGHS returns at its time limit is checked against all constraints before it is used. Without a feasible solution yet, HiGHS still returns column values, and using them gave "0 suitable".
