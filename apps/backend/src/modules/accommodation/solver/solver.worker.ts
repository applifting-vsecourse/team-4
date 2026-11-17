import { parentPort, workerData } from 'node:worker_threads';
import { RoomProposalInput } from './room-proposal.types';
import { solveAssignment, SolveOptions } from './solve-assignment';
import { RoomProposalOptions, solveRoomProposal } from './solve-room-proposal';
import { SolverInput } from './solver.types';

// One solve per worker: HiGHS and the local search block their thread.
const job = workerData as
  | { kind: 'assignment'; input: SolverInput; options: SolveOptions }
  | {
      kind: 'proposal';
      input: RoomProposalInput;
      options: RoomProposalOptions;
    };

const solved =
  job.kind === 'proposal'
    ? solveRoomProposal(job.input, job.options)
    : solveAssignment(job.input, job.options);

solved.then(
  (result) => parentPort?.postMessage({ result }),
  (error: unknown) => parentPort?.postMessage({ error: String(error) }),
);
