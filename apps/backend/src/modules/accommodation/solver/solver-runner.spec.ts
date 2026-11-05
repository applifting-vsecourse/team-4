import { solveAssignmentInWorker } from './solver-runner';

describe('solveAssignmentInWorker', () => {
  it('solves in a worker thread and returns the same result shape', async () => {
    const result = await solveAssignmentInWorker({
      rooms: [{ id: 'R1', baseBeds: 1, extraBeds: 0 }],
      hasHardAttribute: true,
      confirmed: [],
      candidates: [
        { id: 'P1', value: 'Ž', position: 0 },
        { id: 'P2', value: 'Ž', position: 1 },
      ],
    });
    expect(result).toMatchObject({
      status: 'solved',
      suitable: ['P1'],
      unplaced: [{ id: 'P2', reason: 'A' }],
    });
  }, 30_000);
});
