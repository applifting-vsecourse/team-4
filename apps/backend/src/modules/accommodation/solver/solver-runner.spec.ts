import {
  solveAssignmentInWorker,
  solveRoomProposalInWorker,
} from './solver-runner';

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

describe('solveRoomProposalInWorker', () => {
  it('lays out a term in a worker thread', async () => {
    const result = await solveRoomProposalInWorker({
      rooms: [
        { id: 'R1', label: 'R1', available: true, baseBeds: 2, extraBeds: 0 },
      ],
      hasHardAttribute: false,
      participants: ['P1', 'P2'].map((id, position) => ({
        id,
        position,
        value: null,
        softValues: {},
        otherTermRoomIds: [],
      })),
      wishes: [],
      preferences: [],
    });
    expect(result).toMatchObject({
      status: 'solved',
      rooms: { P1: 'R1', P2: 'R1' },
    });
  }, 30_000);
});
