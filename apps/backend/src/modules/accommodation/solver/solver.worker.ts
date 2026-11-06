import { parentPort, workerData } from 'node:worker_threads';
import { solveAssignment, SolveOptions } from './solve-assignment';
import { SolverInput } from './solver.types';

// One evaluation per worker: HiGHS blocks its thread while solving.
const { input, options } = workerData as {
  input: SolverInput;
  options: SolveOptions;
};

solveAssignment(input, options).then(
  (result) => parentPort?.postMessage({ result }),
  (error: unknown) => parentPort?.postMessage({ error: String(error) }),
);
