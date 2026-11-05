import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import { SolveOptions } from './solve-assignment';
import { SolverInput, SolverResult } from './solver.types';

// Runs `solveAssignment` in a worker thread, so the API keeps serving other
// requests while HiGHS works (spec v4 §7). The worker is terminated a little
// after the solver's own limit in case HiGHS does not return in time.

const GRACE_MS = 2_000;

const workerFile = (): { file: string; execArgv: string[] } =>
  __filename.endsWith('.ts')
    ? {
        // Tests and ts-node scripts run the TypeScript source.
        file: join(__dirname, 'solver.worker.ts'),
        execArgv: ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register'],
      }
    : { file: join(__dirname, 'solver.worker.js'), execArgv: [] };

export function solveAssignmentInWorker(
  input: SolverInput,
  options: SolveOptions = {},
): Promise<SolverResult> {
  const timeLimitMs = options.timeLimitMs ?? 30_000;
  const { file, execArgv } = workerFile();
  const worker = new Worker(file, {
    workerData: { input, options: { ...options, timeLimitMs } },
    execArgv,
  });
  const started = Date.now();

  return new Promise<SolverResult>((resolve, reject) => {
    const timer = setTimeout(() => {
      void worker.terminate();
      resolve({
        status: 'timeout',
        stats: { millis: Date.now() - started, solves: 0, complete: false },
      });
    }, timeLimitMs + GRACE_MS);
    worker.once(
      'message',
      (message: { result?: SolverResult; error?: string }) => {
        clearTimeout(timer);
        void worker.terminate();
        if (message.result) resolve(message.result);
        else reject(new Error(message.error ?? 'Solver worker failed'));
      },
    );
    worker.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}
