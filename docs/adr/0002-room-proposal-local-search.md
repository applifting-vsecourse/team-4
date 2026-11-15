# ADR-0002: Lay out room proposals by deterministic local search

- **Status:** Proposed
- **Proposed:** 2026-11-14
- **Deciders:** tech lead (`rmnskb`); PM (`darebakdavca`) for the spec-visible
  consequences (the notice and §7.1)
- **Related:** #365, #325, #26, #223

## Context

The approved phase-2 spec
([`docs/architecture/accommodation-solver-phase-2.md`](../architecture/accommodation-solver-phase-2.md))
ranks the goals of a room proposal lexicographically. U1 places as many
confirmed people as possible, by person order. U2–U7 cover the room of other
terms, the ranked soft preferences, moves, extra beds, rooms and ties. Its limits:

- U1 is exact and must finish within 30 s per term.
- U2–U7 may stop at the best layout found.
- The same input and solver version give the same proposal.

The phase-1 solver (#223) solves each level as a mixed-integer program in HiGHS.
For #365 the same staged approach was built on a room-level model. It passes all
spec examples, but the benchmark (`pnpm backend solver:proposal-benchmark`: 200
confirmed people, 40 rooms with 24 identical ones, about 80 wishes, 3 or 5
preferences) showed:

- U1 is exact and fast in every case.
- No preference level is ever proven optimal, not even with 240 s per term.
  With saved placements the first preference level (wishes) uses the whole
  budget, so moves (U4), beds, rooms and ties (U5–U7) are never optimized. A
  proposal then moves about 35 people for no reason.
- Results that stop at a time limit depend on machine speed, so the same input
  can give different proposals.

The identical rooms make the search highly symmetric, and the room-level wish
and attribute rows give a weak LP bound. More time does not close the gap.

## Decision

We split the room proposal into an exact first stage and a deterministic local
search, in `apps/backend/src/modules/accommodation/solver/`.

- **U1 stays exact, on an aggregate model.** At U1, people of one hard-attribute
  value are interchangeable, and so are open rooms with the same beds and no
  lock. A small HiGHS model decides how many people of each value are placed,
  then the priority by person order, as phase 1 does. A small exact assignment
  then decides which room carries which value, serving the rooms placed people
  had in other terms first, then their saved rooms. A greedy fill gives a valid
  starting layout close to the current one.
- **U2–U7 are improved by local search** over valid layouts:
  - moves: relocate one person, swap two people, swap the contents of two
    rooms, and bring both people of an unmet wish into one room;
  - every move keeps the hard constraints (O1–O6) and who is placed (U1);
  - layouts are compared by the score vector U2–U6; a final pass then orders
    ties (U7);
  - scores are updated per room, person and wish pair, not recomputed.
- **Determinism:** inputs are put in one order (rooms, people, wishes, rooms of
  other terms), a fixed move order, a seeded generator for perturbation, and a
  budget counted in evaluated moves (2 000 000, a quarter of it kept for ties,
  and a stop after 50 rounds without improvement), not time.
- **Re-search as if applied:** up to two more searches, with half the budget
  each, start from the result, counting moves against it as if the organizer
  had applied it, and replace it while they improve U2–U6. This reduces, but
  does not remove, the moves a re-run after applying makes (see Consequences).
- **The notice "Rozdělení nemusí být nejlepší možné"** (spec §7) is shown only
  when the 30 s wall-clock safety net stops the search. Running out of the move
  budget is deterministic and expected, so it does not show the notice, although
  no level is ever proven optimal.
- **The exact staged solve is kept as a test oracle** (`strategy: 'exact'`). The
  13 spec examples run against the search, and on 60 sampled small terms the
  search must reach the oracle's scores.

## Alternatives considered

- **Keep the staged MIP and give it more time or per-level budgets:** the
  benchmark shows the gap does not close at 8× the budget, and results stay
  machine-dependent.
- **A CP-SAT service (OR-Tools):** a throwaway spike on the same benchmark cases,
  with U1 fixed, solved U2–U6 lexicographically:
  - one worker, deterministic: 16–51 unmet wishes against 2–12 for the search,
    37–52 s, no level proven;
  - eight workers, not deterministic: wishes proven optimal (1 and 10, the
    search had 2 and 12), but 83–158 s in total and the lower levels unproven
    and mostly worse than the search.

  It would also add a Python service to deploy and operate. Not worth it now.

- **Strengthen the MIP** (aggregated room types, symmetry-breaking compatible with
  U7, warm starts): wishes break the interchangeability that aggregation relies
  on, and symmetry-breaking rows were slower in the phase-1 spike.

## Consequences

Measured with the benchmark on one machine (16 cores; times vary by machine):

| Case                              | Staged MIP, 30 s                                 | Local search                           |
| --------------------------------- | ------------------------------------------------ | -------------------------------------- |
| First proposal                    | 1–2 unmet wishes, then out of time               | 2–3 unmet wishes, all levels, 6–7 s    |
| Saved and locked                  | 6–10 unmet wishes, 37–40 moves, U4–U7 not run    | 6–13 unmet wishes, 32–39 moves, 6–8 s  |
| Two rooms lost after confirmation | U1 on the room-level model alone took up to 28 s | U1 in 2–5 small solves, 6–7 s in total |

- Every proposal optimizes every level within the time limit and is
  reproducible. U1 stays exact and no longer risks the time limit.
- U2–U7 have no optimality proof, as the spec allows. On the top preference
  level the search is 1–3 wishes off the proven optimum in the spike cases. A
  larger budget improves this only slowly (6× the budget: 13 → 12 unmet).
- The oracle is not always reached: a wider fuzz of 400 small terms found one
  where the search stays at a worse score (it needs two relocations at once to
  switch a room's value), and three where it chose another tie (U7). Ties reach
  the earliest layout only as far as simple moves go; the result is still the
  same for the same input.
- **Spec §7.1 as approved did not hold in general:** it said a re-run after
  applying moves nobody. Two causes, measured as "re-run after apply" in the benchmark:
  - The search: a re-run can find a better layout and move people for it. Without
    rooms of other terms the re-run moved 0 and 48 people in the two cases;
    without a round limit the re-search keeps improving for six or more rounds.
  - The spec itself: applying gives everyone placed a saved room, so U2 (§5.2) no
    longer counts and wishes (U3) outrank moves (U4). A re-run then moves
    people even for a proven-optimal solver: in the spike, 176 people, with
    wishes going 10 → 2. With rooms of other terms the search's re-run moved 34
    and 81.

  The PM relaxed §7.1 (decision on this PR): a re-run after applying may
  suggest further moves, which the organizer sees as a difference, and stored
  placements change only when the organizer applies the new proposal. The
  spec change is #374.

- The search is our own code to maintain and tune; its moves and budget are
  covered by the oracle and example tests.
- Revisit if organizers report poor proposals, if the gap to the oracle grows,
  or if terms grow well beyond 200 people.
