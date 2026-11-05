import highsLoader from 'highs';
import { Constraint, Expression } from './assignment-model';

// One HiGHS run per call. HiGHS blocks the thread while it works; callers run
// the whole evaluation in a worker (see solver-runner.ts).

export type Highs = Awaited<ReturnType<typeof highsLoader>>;
export type Solution = Record<string, number>;
export type Stage = { value: number; solution: Solution; optimal: boolean };
export type Sense = 'Maximize' | 'Minimize';
/** Writes the model with one objective and extra constraints as LP text. */
export type Render = (
  sense: Sense,
  objective: Expression,
  fixed: Constraint[],
) => string;

export class TimeLimit extends Error {}
export class Infeasible extends Error {}

let highs: Promise<Highs> | null = null;
export const loadHighs = (): Promise<Highs> => (highs ??= highsLoader());

export const valueOf = (expression: Expression, solution: Solution): number =>
  expression.reduce((sum, [c, name]) => sum + c * (solution[name] ?? 0), 0);

export class HighsRunner {
  solves = 0;
  constructor(
    readonly solver: Highs,
    private readonly render: Render,
    /** The model's own constraints, to check an incumbent found in time. */
    private readonly constraints: Constraint[],
    private readonly deadline: number,
  ) {}

  /**
   * With `acceptIncumbent`, a stage that runs out of time returns the best
   * solution HiGHS found so far, or null when it has no feasible one yet (its
   * columns then hold values that break the constraints). HiGHS checks its
   * clock only now and then, so a stage can overrun the limit by seconds.
   */
  solve(
    sense: Sense,
    objective: Expression,
    fixed: Constraint[],
    options: { acceptIncumbent: true },
  ): Stage | null;
  solve(sense: Sense, objective: Expression, fixed: Constraint[]): Stage;
  solve(
    sense: Sense,
    objective: Expression,
    fixed: Constraint[],
    { acceptIncumbent = false }: { acceptIncumbent?: boolean } = {},
  ): Stage | null {
    const remaining = (this.deadline - Date.now()) / 1000;
    if (remaining <= 0) throw new TimeLimit();
    this.solves += 1;
    const result = this.solver.solve(this.render(sense, objective, fixed), {
      output_flag: false,
      mip_rel_gap: 0,
      time_limit: remaining,
    });
    if (result.Status === 'Infeasible') throw new Infeasible();
    const timedOut = result.Status === 'Time limit reached';
    if (timedOut && !acceptIncumbent) throw new TimeLimit();
    if (!timedOut && result.Status !== 'Optimal') {
      throw new Error(`HiGHS ended with status ${result.Status}`);
    }
    const columns = Object.entries(result.Columns) as [
      string,
      { Primal?: number },
    ][];
    const solution: Solution = {};
    for (const [name, column] of columns) {
      solution[name] = Math.round(column.Primal ?? NaN);
    }
    if (timedOut && !this.isFeasible(solution, fixed)) return null;
    return {
      value: valueOf(objective, solution),
      solution,
      optimal: !timedOut,
    };
  }

  private isFeasible(solution: Solution, fixed: Constraint[]): boolean {
    return [...this.constraints, ...fixed].every(
      ({ expression, sense, rhs }) => {
        const value = valueOf(expression, solution);
        if (Number.isNaN(value)) return false;
        if (sense === '<=') return value <= rhs;
        if (sense === '>=') return value >= rhs;
        return value === rhs;
      },
    );
  }
}
