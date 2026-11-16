import { Constraint, Expression } from './assignment-model';
import { HighsRunner, Solution, valueOf } from './highs-runner';
import { Layout, PreparedProposal } from './room-proposal-layout';
import { placementOf, ProposalModel, x } from './room-proposal-model';

// The exact staged solve of the room proposal (§5): each level is a HiGHS
// program that fixes its optimum for the next ones. It proves optimality on
// small terms only, so it is the test oracle of the local search (ADR-0002).
//   U1 most confirmed placed, then exact priority by person order
//   U2 same room as in the person's other terms
//   U3 each ranked soft preference, strictly in order
//   U4 fewest moves from unlocked saved placements
//   U5 base beds before extra beds
//   U6 fewest rooms
//   U7 ties: earliest room for each person in person order

export function solveExactLevels(
  runner: HighsRunner,
  prepared: PreparedProposal,
  model: ProposalModel,
): { solution: Solution; complete: boolean } {
  const fixed: Constraint[] = [];
  const { objectives } = model;
  let solution = solveFirstLevel(runner, prepared, model, fixed);

  for (const objective of [
    objectives.crossTerm,
    ...objectives.preferences,
    objectives.moves,
    objectives.extraBeds,
    objectives.rooms,
  ]) {
    if (objective.length === 0) continue;
    const stage = runner.solve('Minimize', objective, fixed, {
      acceptIncumbent: true,
    });
    if (!stage) return { solution, complete: false };
    solution = stage.solution;
    if (!stage.optimal) return { solution, complete: false };
    fixed.push({ expression: objective, sense: '=', rhs: stage.value });
  }
  return breakTies(runner, prepared, model, fixed, solution);
}

/**
 * U1, exact, and it throws when out of time: the most people placed, then
 * the priority. Its optimum is added to `fixed`.
 */
function solveFirstLevel(
  runner: HighsRunner,
  prepared: PreparedProposal,
  model: ProposalModel,
  fixed: Constraint[],
): Solution {
  const { count: expression } = model.objectives;
  const count = runner.solve('Maximize', expression, fixed);
  fixed.push({ expression, sense: '=', rhs: count.value });
  return preferPositions(runner, prepared, model, fixed, count);
}

/**
 * U1, second part: walking the person order from the top, each unlocked
 * participant is fixed as placed when the optimal count still allows it.
 */
function preferPositions(
  runner: HighsRunner,
  prepared: PreparedProposal,
  model: ProposalModel,
  fixed: Constraint[],
  { solution: initial, value: optimal }: { solution: Solution; value: number },
): Solution {
  let solution = initial;
  let placed = 0;
  for (const i of model.unlocked) {
    const expression = placementOf(prepared, i);
    if (expression.length === 0) continue;
    if (placed === optimal) {
      fixed.push({ expression, sense: '=', rhs: 0 });
      continue;
    }
    if (valueOf(expression, solution) !== 1) {
      const attempt = runner.solve('Maximize', expression, fixed);
      if (attempt.value === 1) solution = attempt.solution;
    }
    const isPlaced = valueOf(expression, solution) === 1;
    fixed.push({ expression, sense: '=', rhs: isPlaced ? 1 : 0 });
    if (isPlaced) placed += 1;
  }
  return solution;
}

/**
 * U7: walking the person order, each placed unlocked participant takes the
 * earliest room (room order) that keeps every level's optimum.
 */
function breakTies(
  runner: HighsRunner,
  prepared: PreparedProposal,
  model: ProposalModel,
  fixed: Constraint[],
  initial: Solution,
): { solution: Solution; complete: boolean } {
  let solution = initial;
  for (const i of model.unlocked) {
    const allowed = prepared.allowed[i]!;
    const current = allowed.find((r) => solution[x(i, r)] === 1);
    if (current === undefined) continue;
    // Allowed rooms are in room order; nothing earlier means nothing to try.
    if (allowed[0] !== current) {
      // Each room weighs its index in room order, so the minimum is the
      // earliest room the fixed optima still allow.
      const earliest: Expression = allowed.map((r) => [r, x(i, r)] as const);
      const stage = runner.solve('Minimize', earliest, fixed, {
        acceptIncumbent: true,
      });
      if (!stage) return { solution, complete: false };
      solution = stage.solution;
      if (!stage.optimal) return { solution, complete: false };
    }
    const room = allowed.find((r) => solution[x(i, r)] === 1)!;
    fixed.push({ expression: [[1, x(i, room)]], sense: '=', rhs: 1 });
  }
  return { solution, complete: true };
}

export function layoutOf(
  prepared: PreparedProposal,
  solution: Solution,
): Layout {
  return prepared.participants.map((_, i) =>
    prepared.allowed[i]!.find((r) => solution[x(i, r)] === 1),
  );
}
