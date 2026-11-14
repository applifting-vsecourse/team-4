import {
  ProposalParticipant,
  ProposalRoom,
  RoommateWish,
  RoomProposalInput,
  RoomProposalResult,
  SoftPreference,
} from '@/modules/accommodation/solver/room-proposal.types';
import { solveRoomProposal } from '@/modules/accommodation/solver/solve-room-proposal';

// Benchmark of the room proposal (phase 2, #365): about 200 confirmed
// participants in 40 rooms, gender as the hard attribute, 3 or 5 ranked
// preferences (wishes and categorical attributes). Cases: a first proposal,
// one with saved placements, locks and other terms' rooms, a re-run after a
// few changes, and two rooms lost after confirmation (some people unplaced). The spec limit is 30 s per term (U1 exact, U2–U7 best found).
//
//   pnpm backend solver:proposal-benchmark

const PARTICIPANTS = 200;

function random(seed: number): () => number {
  let state = seed;
  return (): number => {
    state = (state * 1_103_515_245 + 12_345) % 2 ** 31;
    return state / 2 ** 31;
  };
}

function rooms(): ProposalRoom[] {
  const list: ProposalRoom[] = [];
  const add = (count: number, baseBeds: number, extraBeds: number): void => {
    for (let i = 0; i < count; i += 1) {
      const id = `R${list.length + 1}`;
      list.push({
        id,
        label: `Pokoj ${list.length + 1}`,
        available: true,
        baseBeds,
        extraBeds,
      });
    }
  };
  // 208 beds (190 base) for 200 confirmed: phase 1 confirmed only who fit.
  add(24, 5, 0);
  add(8, 5, 1);
  add(6, 3, 1);
  add(2, 6, 2);
  return list;
}

function scenario(
  seed: number,
  preferenceCount: number,
  withHistory: boolean,
): RoomProposalInput {
  const next = random(seed);
  const pick = <T>(values: T[]): T =>
    values[Math.floor(next() * values.length)]!;
  const allRooms = rooms();
  const attributes = Array.from(
    { length: preferenceCount - 1 },
    (_, k) => `soft${k}`,
  );
  const participants: ProposalParticipant[] = Array.from(
    { length: PARTICIPANTS },
    (_, i) => ({
      id: `P${i + 1}`,
      position: i,
      value: next() < 0.5 ? 'Ž' : 'M',
      softValues: Object.fromEntries(
        attributes.map((attribute, k) => [
          attribute,
          next() < 0.1
            ? null
            : pick(['a', 'b', 'c', 'd'].slice(0, 2 + (k % 3))),
        ]),
      ),
      otherTermRoomIds: [],
    }),
  );
  if (withHistory) {
    // A previous layout: same-value people in rooms of four, some locked,
    // some with the room of another term.
    const byValue = (value: string): ProposalParticipant[] =>
      participants.filter((p) => p.value === value);
    let r = 0;
    for (const group of [byValue('Ž'), byValue('M')]) {
      for (let start = 0; start < group.length && r < 24; start += 4, r += 1) {
        for (const p of group.slice(start, start + 4)) {
          const roll = next();
          if (roll < 0.5) p.savedRoomId = allRooms[r]!.id;
          if (roll < 0.1) p.locked = true;
          if (roll > 0.8) p.otherTermRoomIds = [allRooms[r]!.id];
        }
      }
    }
  }
  const wishes: RoommateWish[] = participants.flatMap((p) =>
    next() < 0.35
      ? [
          {
            from: p.id,
            to: pick(participants.filter((q) => q.value === p.value)).id,
          },
        ]
      : [],
  );
  const preferences: SoftPreference[] = [
    { kind: 'wishes' },
    ...attributes.map((id) => ({
      kind: 'attribute' as const,
      id,
      neutralValues: [],
    })),
  ];
  return {
    rooms: allRooms,
    hasHardAttribute: true,
    participants,
    wishes,
    preferences,
  };
}

async function run(
  name: string,
  input: RoomProposalInput,
): Promise<RoomProposalResult> {
  const result = await solveRoomProposal(input);
  const detail =
    result.status === 'solved'
      ? `placed ${result.scores.placed}, cross-term ${result.scores.crossTerm}, ` +
        `preferences [${result.scores.preferences.join(', ')}], moves ${result.scores.moves}, ` +
        `extra beds ${result.scores.extraBeds}, rooms ${result.scores.rooms}` +
        (result.stats.complete ? '' : ', stopped at the time limit')
      : 'TIMEOUT';
  console.log(
    `${name.padEnd(36)} ${input.participants.length} people, ${input.wishes.length} wishes → ` +
      `${detail} in ${result.stats.millis} ms (${result.stats.solves} solves)`,
  );
  return result;
}

/** The input after the organizer applied `result`: its rooms are saved. */
function applied(
  input: RoomProposalInput,
  result: RoomProposalResult,
): RoomProposalInput {
  if (result.status !== 'solved') return input;
  return {
    ...input,
    participants: input.participants.map((p) =>
      p.locked ? p : { ...p, savedRoomId: result.rooms[p.id] },
    ),
  };
}

async function main(): Promise<void> {
  for (const count of [3, 5]) {
    // A re-run after applying should move nobody (spec §7.1); its moves are
    // printed as "moves".
    const first = scenario(365, count, false);
    const firstResult = await run(
      `first proposal, ${count} preferences`,
      first,
    );
    await run(`  re-run after apply`, applied(first, firstResult));
    const history = scenario(365, count, true);
    const saved = await run(`saved and locked, ${count} preferences`, history);
    await run(`  re-run after apply`, applied(history, saved));
    // A re-run after small changes: a few saved placements removed.
    await run(`re-run after changes, ${count} preferences`, {
      ...history,
      participants: history.participants.map((p, i) =>
        i % 25 === 0 && !p.locked ? { ...p, savedRoomId: undefined } : p,
      ),
    });
    await run(`two rooms lost, ${count} preferences`, {
      ...history,
      rooms: history.rooms.map((room, r) =>
        r >= 22 && r < 24 ? { ...room, available: false } : room,
      ),
    });
  }
}

void main();
