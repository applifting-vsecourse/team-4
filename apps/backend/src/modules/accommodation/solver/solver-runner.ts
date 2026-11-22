import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import { RoomProposalInput, RoomProposalResult } from './room-proposal.types';
import { SolveOptions } from './solve-assignment';
import { RoomProposalOptions } from './solve-room-proposal';
import { SolverInput, SolverResult } from './solver.types';

// Runs `solveAssignment` and `solveRoomProposal` in a worker thread, so the
// API keeps serving other requests while they work (spec v4 §7, phase-2 spec
// §7). The worker is terminated a little after the solver's own limit in case
// it does not return in time.

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
  return runInWorker<SolverResult>(
    { kind: 'assignment', input, options: { ...options, timeLimitMs } },
    timeLimitMs,
    (millis) => ({
      status: 'timeout',
      stats: { millis, solves: 0, complete: false },
    }),
  );
}

/** The room proposal (phase 2) in a worker thread, the same way. */
export function solveRoomProposalInWorker(
  input: RoomProposalInput,
  options: RoomProposalOptions = {},
): Promise<RoomProposalResult> {
  const timeLimitMs = options.timeLimitMs ?? 30_000;
  return runInWorker<RoomProposalResult>(
    { kind: 'proposal', input, options: { ...options, timeLimitMs } },
    timeLimitMs,
    (millis) => ({
      status: 'timeout',
      stats: { millis, solves: 0, complete: false },
    }),
  );
}

function runInWorker<R>(
  job: unknown,
  timeLimitMs: number,
  timedOut: (millis: number) => R,
): Promise<R> {
  const { file, execArgv } = workerFile();
  const worker = new Worker(file, { workerData: job, execArgv });
  const started = Date.now();

  return new Promise<R>((resolve, reject) => {
    const timer = setTimeout(() => {
      void worker.terminate();
      resolve(timedOut(Date.now() - started));
    }, timeLimitMs + GRACE_MS);
    worker.once('message', (message: { result?: R; error?: string }) => {
      clearTimeout(timer);
      void worker.terminate();
      if (message.result) resolve(message.result);
      else reject(new Error(message.error ?? 'Solver worker failed'));
    });
    worker.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}
